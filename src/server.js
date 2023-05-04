const express = require('express');
const axios = require('axios');
const fs = require('fs-extra');
const { exec } = require('child_process');
const path = require('path');

const app = express();

app.get('/generate-changelog', async (req, res) => {
console.log(process.cwd())
  try {
    const {
      data: { data: tasks },
    } = await axios.get('http://localhost:1337/api/tasks?populate=networks.org,types.parent&sort=date:ASC');

    const tasksByChainId = {};

    for (const task of tasks) {
      const networks = extractRelationalData(task, ["networks"]);
      const orgs = extractRelationalData(task, ["networks", "org"]);

      if (networks.length === 0) {
        console.warn('Skipping a task with missing network data');
        continue;
      }

      for (let i = 0; i < networks.length; i++) {
        const network = networks[i];
        const org = orgs[i];
        const chainId = network.chain_id;

        if (!tasksByChainId[chainId]) {
          tasksByChainId[chainId] = [];
        }
        tasksByChainId[chainId].push({ task, network, org });
      }
    }

    const outputDir = path.resolve(__dirname, '../');
    await deleteChangelogFiles(outputDir)

    for (const chainId in tasksByChainId) {

      await fs.ensureDir(outputDir);

      const { network, org } = tasksByChainId[chainId][0];
      const changelogPath = `${outputDir}/_CHANGELOG: ${network.pretty_name} (${chainId}).md`;
      await fs.ensureFile(changelogPath);

      //will all be the same, get first to use as header for all tasks
      const changelogHeader = `# ${network.pretty_name} (${network.chain_id})

${network.desc || ""} 

## ${org.name} Organization Resources

* Website ${replaceUrlsWithMarkdownLinks(org.website)}
* Twitter ${replaceUrlsWithMarkdownLinks(org.twitter)}
* Discord ${replaceUrlsWithMarkdownLinks(org.discord)}
* Governance ${replaceUrlsWithMarkdownLinks(org.governance)}
* Blog ${replaceUrlsWithMarkdownLinks(org.blog)}
* Telegram ${replaceUrlsWithMarkdownLinks(org.telegram)}
* Youtube ${replaceUrlsWithMarkdownLinks(org.youtube)}

## ${network.chain_id} Chain Resources

* Repo ${replaceUrlsWithMarkdownLinks(org.repo)}
* Docs ${replaceUrlsWithMarkdownLinks(org.docs)}
* Explorer ${replaceUrlsWithMarkdownLinks(network.explorer)}
* Validator Status ${replaceUrlsWithMarkdownLinks(network.status)}
* Delegate to LOA Labs: [Earn Rewards via Keplr](${network.delegate})

## Activities / Contributions
| Date | Title | Desc | Link | Type |
| :----------- | :------------ | :-------------------------------- | :---- | :---- |\n`

      const changelogContent = tasksByChainId[chainId]
        .map(({ task: { attributes: { date, types, title, desc, link } } }) => {
          return `| ${date} | ${title} | ${replaceNewlines(replaceUrlsWithMarkdownLinks(desc))} | [${truncateText(link, 30)}](${link}) | ${makeTypes(types)} |`;
        })
        .join('\n');

      await fs.writeFile(changelogPath, changelogHeader + changelogContent);
    }

    exec('git pull && git add . && git commit -m "Build Logs" && git push', (error, stdout, stderr) => {
      if (error) {
        if (error.message.includes('index.lock')) {
          console.error('Another Git process is running, or the lock file was not properly removed. Please try again later.');
        } else {
          console.error(`exec error: ${error}`);
        }
        return;
      }
      console.log(`stdout: ${stdout}`);
      if (stderr) console.error(`stderr: ${stderr}`);
    });

    res.status(200).send(`<style>body{background:#999;}</style>Changelogs generated and pushed to the repository\n\n`);

  } catch (error) {
    console.error(error);
    res.status(500).send('<style>body{background:#555;}</style>Error.');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

function extractRelationalData(root, relationBranches) {
  if (!root || !root.attributes || relationBranches.length === 0) {
    return root ? root.attributes : undefined;
  }

  const currentRelation = relationBranches[0];
  const remainingBranches = relationBranches.slice(1);
  const nextRootArray = root.attributes[currentRelation]?.data || [];

  if (Array.isArray(nextRootArray)) {
    const resultArray = nextRootArray.map(item => {
      return extractRelationalData(item, remainingBranches);
    });

    return resultArray;
  } else {
    return extractRelationalData(nextRootArray, remainingBranches);
  }
}

function makeTypes(types) {
  return types?.data?.map(type => {
    return `${type.attributes.parent?.data.attributes.abbreviation}-${type.id}`;
  }).join(', ');
}

function truncateText(text, maxLength) {
  if (text.length <= maxLength) {
    return text;
  }

  const leftHalf = Math.floor((maxLength - 3) / 2);
  const rightHalf = maxLength - 3 - leftHalf;

  return text.substring(0, leftHalf) + '...' + text.substring(text.length - rightHalf);
}

function replaceUrlsWithMarkdownLinks(text) {
  const urlRegex = /((http|https):\/\/[\w?=&.\/\-;#~%\-]+(\.[a-z]{2,4})?[^.\s]+)/gi;
  if (text == null || text == undefined) return "n/a";
  return text.replace(urlRegex, (url) => {
    const truncatedUrl = truncateText(url, 30);
    return `[${truncatedUrl}](${url})`;
  });
}

async function deleteChangelogFiles(dirPath) {
  try {
    const files = await fs.readdir(dirPath);
    const changelogFiles = files.filter((file) => file.startsWith('_'));

    for (const file of changelogFiles) {
      const filePath = path.join(dirPath, file);
      await fs.unlink(filePath);
      console.log(`Deleted: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error deleting Changelog files: ${error}`);
  }
}

function replaceNewlines(text, replacement = '<br>') {
  return text.replace(/\r?\n|\r/g, replacement);
}
