const express = require('express');
const axios = require('axios');
const fs = require('fs-extra');
const { exec } = require('child_process');

const app = express();

function extractNetworkData(task) {
  return task.attributes.network.data.attributes;
}

app.get('/generate-changelog', async (req, res) => {
  try {
    const {
      data: { data: tasks },
    } = await axios.get('http://localhost:1337/api/tasks?populate=*');

    const tasksByChainId = {};

    for (const task of tasks) {
      const chainId = extractNetworkData(task).chain_id;
      if (!tasksByChainId[chainId]) {
        tasksByChainId[chainId] = [];
      }
      tasksByChainId[chainId].push(task);
    }

    for (const chainId in tasksByChainId) {
      const outputDir = `./output/${chainId}`;

      await fs.ensureDir(outputDir);

      const changelogPath = `${outputDir}/CHANGELOG.md`;
      await fs.ensureFile(changelogPath);

      const changelogContent = tasksByChainId[chainId]
        .map((task) => `- Task ID: ${task.id}`)
        .join('\n');

      await fs.writeFile(changelogPath, changelogContent);
    }

    exec('git add . && git commit -m "Update CHANGELOG.md" && git push', (error, stdout, stderr) => {
      if (error) {
        if (error.message.includes('index.lock')) {
          console.error('Another Git process is running, or the lock file was not properly removed. Please try again later.');
        } else {
          console.error(`exec error: ${error}`);
        }
        return;
      }
      console.log(`stdout: ${stdout}`);
      console.error(`stderr: ${stderr}`);
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
