const tmp = require('tmp');
const sh = require('shelljs');
const fs = require('fs-extra');
const yaml = require('js-yaml');
const path = require('path');
const log = require('../utils/logger');
const git = require('../utils/git');
const config = require('../config');
const Stack = require('./stack');

const tmpDir = tmp.dirSync();
const repoPath = tmpDir.name;
const repo = git(repoPath);

async function gitCryptUnlock() {
  return new Promise((resolve, reject) => {
    sh.cd(repoPath);
    sh.exec(`git-crypt unlock ${config.git_crypt.keyFile}`, (code, stdout, stderr) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(stderr));
      }
    });
  });
}

async function checkForUpdates() {
  repo.cwd(repoPath);

  if (await repo.checkIsRepo()) {
    await repo.pull();
  } else {
    await repo.clone(config.git.url, repoPath);
  }

  if (config.git_crypt && config.git_crypt.keyFile) {
    await gitCryptUnlock();
  }

  const stackDirs = await fs.readdir(path.resolve(repoPath, 'stacks'));
  // Stacks in target are defined in config.stacks, and have a corresponding stacks/[stack-name]/stack.yml in the repo
  const targetStacks = stackDirs.filter(s => config.stacks.includes(s));
  log.info(`Target stacks: ${targetStacks.join(',')}`);

  const stacks = targetStacks.map(
    stackName =>
      new Stack({
        name: stackName,
        stackDef: yaml.safeLoad(
          fs.readFileSync(
            path.resolve(repoPath, 'stacks', stackName, 'stack.yml'),
            'utf8'
          )
        ),
        configRepoPath: repoPath
      })
  );

  const changedStacks = [];

  for (const stack of stacks) {
    const changedStackPacks = await stack.getChanges();
    if (changedStackPacks.length) {
      changedStacks.push({
        stack,
        packs: changedStackPacks
      });
    }
  }

  return changedStacks;
}

module.exports = {
  checkForUpdates
};
