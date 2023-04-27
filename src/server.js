const express = require('express');
const axios = require('axios');
const fs = require('fs-extra');
const { exec } = require('child_process');

const app = express();

function extractRelationalData(root, relationBranches) {
  if (relationBranches.length === 0) {
    return root.attributes;
  }
  const currentRelation = relationBranches[0];
  const remainingBranches = relationBranches.slice(1);
  if (root.attributes[currentRelation]) {
    const nextRoot = root.attributes[currentRelation].data;
    return extractRelationalData(nextRoot, remainingBranches);
  } else return {}
}

app.get('/generate-changelog', async (req, res) => {
  try {
    const {
      data: { data: tasks },
    } = await axios.get('http://localhost:1337/api/tasks?populate=network.org,types.parent');

    const tasksByChainId = {};

    for (const task of tasks) {
      const network = extractRelationalData(task, ["network"]);
      const org = extractRelationalData(task,["network","org"]);

      const chainId = network.chain_id;

      if (!tasksByChainId[chainId]) {
        tasksByChainId[chainId] = [];
      }
      tasksByChainId[chainId].push({ task , network, org });
    }

    for (const chainId in tasksByChainId) {
      
      const outputDir = `./output/${chainId}`;
      await fs.ensureDir(outputDir);
      
      const changelogPath = `${outputDir}/CHANGELOG.md`;
      await fs.ensureFile(changelogPath);

      //will all be the same, get first to use as header for all tasks
      const { network, org } = tasksByChainId[chainId][0]
      
      const changelogHeader = `# ${network.pretty_name} (${network.chain_id})

## ${org.name} Organization Resources

* Website ${org.website}
* Twitter [@${org.twitter}](https://twitter.com/${org.twitter})
* Discord ${org.discord}

## ${network.chain_id} Chain Resources

* Repo ${network.repo}
* Explorer ${network.explorer}
* Validator Status ${network.status}
* Delegating to LOA Labs to [Earn Rewards via Keplr](${network.delegate})

${network.desc} 

## Activities / Contributions
| Date | Type | Title | Desc | Link |
| :----------- | :---- | :------------ | :-------------------------------- | :---- |`

   
    const changelogContent = tasksByChainId[chainId]
      .map(({ task: { attributes :{ date, types, title, desc, link } } }) => {
        return `| ${date} | ${makeTypes(types)} | ${title} | ${desc} | [${truncateText(link,30)}](${link}) |`;
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
      if(stderr)console.error(`stderr: ${stderr}`);
    });

    res.status(200).send('Changelogs generated and pushed to the repository');
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while generating changelogs');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


function makeTypes(types) {
  return types?.data?.map(type => {
    return `${type.attributes.parent?.data.attributes.abbreviation}-${type.id}`;
  }).join(', ');
}

function truncateText(text, maxLength) {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
}
