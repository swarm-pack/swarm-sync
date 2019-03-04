import tmp from 'tmp';
import sh from 'shelljs';
import yaml from 'js-yaml';
import fs from 'fs-extra';
import { resolve, basename } from 'path';
import git from '../utils/git';
import config from '../config';
import Stack from '../entities/stack';
import Pack from '../entities/pack';

class ConfigRepository {
  constructor() {
    this.tmp = tmp.dirSync();
    this.path = this.tmp.name;
    this.repo = git(this.path);
  }

  //Initialize repo
  async init() {
    return this.repo
      .clone(config.git.url, this.path)
      .then(() => {
        return true
      }).catch(err => {
        console.log("Encountered error cloning repo")
        console.log(err);
        process.exit();
      })
  }

  async gitCryptUnlock() {
    return new Promise((resolve, reject) => {
      if (config.gitCrypt && config.gitCrypt.keyFile) {
        sh.cd(this.path);
        sh.exec(`git-crypt unlock ${config.gitCrypt.keyFile}`, function(code, stdout, stderr) {
          code === 0 ? resolve() : reject(new Error(stderr));
        });
      }else{
        resolve();
      }
    })
  }

  async checkForUpdates() {

    await this.repo.pull();
    await this.gitCryptUnlock();
    const stackDirs = await fs.readdir(resolve(this.path, 'stacks'));
    // Stacks in target are defined in config.stacks, and have a corresponding stacks/[stack-name]/stack.yml in the repo
    const targetStacks = stackDirs.filter(s => s.includes(config.stacks));
    console.log(`Target stacks found: ${targetStacks.join(',')}`);

    const stacks = targetStacks.map((stackName) => {
      return new Stack({
        name: stackName,
        stackDef: yaml.safeLoad(fs.readFileSync(resolve(this.path, 'stacks', stackName, 'stack.yml'), 'utf8')),
        configRepoPath: this.path
      })
    })

    const changedStacks = []

    for (const stack of stacks) {
      const changedStackPacks = await stack.getChanges();
      if (changedStackPacks.length) {
        changedStacks.push({
          stack: stack,
          packs: changedStackPacks
        })
      }
    }

    return changedStacks;
  }
}




export default ConfigRepository;
