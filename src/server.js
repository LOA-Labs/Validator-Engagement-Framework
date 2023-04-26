const express = require('express');
const axios = require('axios');
const fs = require('fs-extra');
const { exec } = require('child_process');

const app = express();

app.get('/generate-changelog', async (req, res) => {
  try {
    const { data: { data: tasks } } = await axios.get('http://localhost:1337/api/tasks?populate=*');
    
    
    for (const task of tasks) {
      console.log(task.attributes)
      console.log(task.attributes.network)
      console.log(task.attributes.network.data.attributes)
      const chainId = task.attributes.network.data.attributes.chain_id;
      console.log(chainId)
      const outputDir = `../output/${chainId}`;

      await fs.ensureDir(outputDir);

      const changelogPath = `${outputDir}/CHANGELOG.md`;
      await fs.ensureFile(changelogPath);

      const changelogContent = tasks
        .filter(t => task.attributes.network.data.attributes.chain_id === chainId)
        .map(t => `- Task ID: ${t.id}`)
        .join('\n');

      await fs.writeFile(changelogPath, changelogContent);

      exec('git add . && git commit -m "Update CHANGELOG.md" ', (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          return;
        }
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
      });
    }

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
