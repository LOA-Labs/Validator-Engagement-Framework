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
    } = await axios.get('http://localhost:1337/api/tasks?populate=networks.org,types.parent&sort=date:ASC&pagination[page]=1&pagination[pageSize]=500');

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

      const changelogPath = `${outputDir}/_CHANGELOG_${network.pretty_name.replace(/[^a-zA-Z0-9-]/g, '_')}_(${chainId}).md`;

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
          // console.log(`Adding ${title} to changelog`)
          return `| ${date} | ${title} | ${replaceNewlines(replaceUrlsWithMarkdownLinks(desc))} | [${truncateText(link, 30)}](${link}) | ${makeTypes(types)} |`;
        })
        .join('\n');

      // await fs.writeFile(changelogPath, changelogHeader + changelogContent);
    }




    //write any pages of the repo
    const { data } = await axios.get("http://localhost:1337/api/pages");
    await writeDataToFile(data.data);

    exec('git pull && git add -A && git commit -m "Build Logs" && git push', (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        console.error(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
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

async function writeDataToFile(data) {
  for (const item of data) {
    const { filepath, content, title } = item.attributes;
    try {
      const parsedContent = await replaceBracketedText(content);
      await fs.writeFile(filepath, parsedContent);
      console.log(`Successfully wrote to file: ${filepath}`);
    } catch (err) {
      console.error(`Error writing to file: ${filepath}\n${err}`);
    }
  }
}


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


async function replaceBracketedText(inputStr) {
  const regex = /{(\w+)}/g;
  let match;
  let result = inputStr;

  while ((match = regex.exec(inputStr)) !== null) {
    if (match[1] && typeof customFunctions[match[1]] === "function") {
      const replacement = await customFunctions[match[1]]();
      result = result.replace(match[0], replacement);
    }
  }

  return result;
}


// Define your custom object with the required functions
const customFunctions = {
  TaskSubTypesOutline: async () => {
    return await generateMarkdownOutline();
  }
};

async function generateMarkdownOutline() {
  const subTypes = await fetchTaskSubTypes();
  const groupedSubTypes = subTypes.reduce((acc, subType) => {
    const parentId = subType.attributes.parent.data.id;
    if (!acc[parentId]) {
      acc[parentId] = {
        parentName: subType.attributes.parent.data.attributes.name,
        parentAbbr: subType.attributes.parent.data.attributes.abbreviation,
        subTypes: [],
      };
    }
    acc[parentId].subTypes.push(subType);
    return acc;
  }, {});

  let markdown = '';
  let counter = 1;

  for (const parent in groupedSubTypes) {
    const parentData = groupedSubTypes[parent];
    markdown += `\n## ${counter++}. ${parentData.parentName} [${parentData.parentAbbr}]\n\n`;

    let counter2 = 0;
    for (const subType of parentData.subTypes) {
      markdown += `### ${intToLetter(counter2++)}. **${subType.attributes.name}**\n${subType.attributes.desc || ""}\n\n`;
    }

    markdown += '\n';
  }

  return markdown;
}

async function fetchTaskSubTypes() {
  try {
    const { data } = await axios.get(
      'http://localhost:1337/api/task-sub-types?populate=*&sort=date:sort:ASC:&pagination[page]=1&pagination[pageSize]=100'
    );
    return data.data;
  } catch (err) {
    console.error(`Error fetching task sub-types: ${err}`);
    return [];
  }
}

function intToLetter(num) {
  return String.fromCharCode(65 + num);
}