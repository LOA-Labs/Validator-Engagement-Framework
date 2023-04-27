const express = require('express');
const axios = require('axios');
const fs = require('fs-extra');
const { exec } = require('child_process');
const path = require('path');

const app = express();

app.get('/generate-changelog', async (req, res) => {
  try {
    const {
      data: { data: tasks },
    } = await axios.get('http://localhost:1337/api/tasks?populate=networks.org,types.parent');

    const tasksByChainId = {};

    for (const task of tasks) {

      const network = extractRelationalData(task, ["networks"])[0];
      const org = extractRelationalData(task, ["networks", "org"])[0];


      if (!network) {
        console.warn('Skipping a task with missing network data');
        continue;
      }

      const chainId = network.chain_id;

      if (!tasksByChainId[chainId]) {
        tasksByChainId[chainId] = [];
      }
      tasksByChainId[chainId].push({ task, network, org });
    }


    const outputDir = `../`;
    await deleteMarkdownFilesExceptReadme(outputDir)

    for (const chainId in tasksByChainId) {

      await fs.ensureDir(outputDir);

      const { network, org } = tasksByChainId[chainId][0];
      const changelogPath = `${outputDir}/_CHANGELOG: ${network.pretty_name} (${chainId}).md`;
      await fs.ensureFile(changelogPath);

      //will all be the same, get first to use as header for all tasks
      const changelogHeader = `# ${network.pretty_name} (${network.chain_id})

## ${org.name} Organization Resources

* Website ${org.website}
* Twitter [@${org.twitter}](https://twitter.com/${org.twitter})
* Discord ${org.discord}
* Governance ${org.governance}
* Blog ${org.blog}
* Telegram ${org.telegram}
* Youtube ${org.youtube}

## ${network.chain_id} Chain Resources

* Repo ${org.repo}
* Docs ${org.docs}
* Explorer ${network.explorer}
* Validator Status ${network.status}
* Delegating to LOA Labs to [Earn Rewards via Keplr](${network.delegate})

${network.desc} 

## Activities / Contributions
| Date | Type | Title | Desc | Link |
| :----------- | :---- | :------------ | :-------------------------------- | :---- |\n`


      const changelogContent = tasksByChainId[chainId]
        .map(({ task: { attributes: { date, types, title, desc, link } } }) => {
          return `| ${date} | ${makeTypes(types)} | ${title} | ${replaceNewlines(replaceUrlsWithMarkdownLinks(desc))} | [${truncateText(link, 30)}](${link}) |`;
        })
        .join('\n');

      await fs.writeFile(changelogPath, changelogHeader + changelogContent);
    }

    exec('git add . && git commit -m "Update CHANGELOG.md"', (error, stdout, stderr) => {
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

    res.status(200).send('<style>body{background:#555;}</style>Changelogs generated and pushed to the repository');
  } catch (error) {
    console.error(error);
    res.status(500).send('<style>body{background:#555;}</style>An error occurred while generating changelogs');
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

  return text.replace(urlRegex, (url) => {
    const truncatedUrl = truncateText(url, 30);
    return `[${truncatedUrl}](${url})`;
  });
}

async function deleteMarkdownFilesExceptReadme(dirPath) {
  try {
    const files = await fs.readdir(dirPath);
    const markdownFiles = files.filter((file) => file.endsWith('.md') && file !== 'README.md');

    for (const file of markdownFiles) {
      const filePath = path.join(dirPath, file);
      await fs.unlink(filePath);
      console.log(`Deleted: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error deleting Markdown files: ${error}`);
  }
}

function replaceNewlines(text, replacement = '<br><br>') {
  return text.replace(/\r?\n|\r/g, replacement);
}
