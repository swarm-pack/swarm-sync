import simpleGit from 'simple-git/promise';
import tmp from 'tmp';
import sh from 'shelljs';
import yaml from 'js-yaml';
import fs from 'fs-extra';
import { resolve, basename } from 'path';
import config from '../config';
import { getDeployedStackPackCommit, getDeployedStackCommit } from './state'

const GIT_SSH_COMMAND = "ssh -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no";


/*

Something like this:

 - Pull repo
 - Intersection of config.stacks & repo/stacks/{stack}
    - Read all stack ymls
    - Mark any changed stack dirs (git log)
 - Read all packs
    - Mark any changed packs (git log)
 - For any changed stacks, deploy all packs (for now, later we can improve this)
 - For any unchanged stacks, deploy any changed packs (if any)

Reference:

Get last commit for particular file or dir:
git log --pretty=tformat:"%H" -n1 README.md

*/

class ConfigRepository {
  constructor() {
    this.tmp = tmp.dirSync();
    this.path = this.tmp.name;
    this.repo = simpleGit(this.path);
  }

  //Initialize repo
  async init() {
    return this.repo
      .env({ ...process.env, GIT_SSH_COMMAND })
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

  getFullPathToPack(pack) {
    return resolve(this.path, 'packs', pack);
  }

  getStackPackValues(stack, pack) {
    return this.readFileSync
  }

  async getStackLastCommit(stack) {
    return this.repo.log({ file: `stacks/${stack}.yml` }).then(log => log.latest.hash)
  }

  async getPackLastCommit(pack) {
    return this.repo.log({ file: `packs/${pack}` }).then(log => log.latest.hash)
  }

  async checkForUpdates() {
    return this.repo.pull()
      .then(() => this.gitCryptUnlock())
      // Get list of stacks & packs
      .then(() => fs.readdir(resolve(this.path, 'stacks')).then(stackFiles => stackFiles.map(sf => basename(sf, '.yml'))))
      .then((stacks) => fs.readdir(resolve(this.path, 'packs')).then((packs) => ({stacks, packs})))
      .then(async({stacks, packs}) => {

        // Stacks in target are defined in config.stacks, and have a corresponding stacks/[stack].yml in the repo
        const targetStacks = stacks.filter(s => s.includes(config.stacks));
        console.log(`Target stacks found: ${targetStacks.join(',')}`);

        // Changes [{stack: 'foo', packs: 'bar'}] will contain a list of stacks (and it's packs)
        // ..which need to be redeployed
        const changes = [];

        for (const stack of targetStacks) {
          const stackDefinition = yaml.safeLoad(fs.readFileSync(resolve(this.path, 'stacks', `${stack}.yml`), 'utf8'));

          if (getDeployedStackCommit(stack) !== await this.getStackLastCommit(stack)) {
            changes.push({
              stack,
              packs: stackDefinition.packs
            })
          }else {
            // Individual pack changes for stack
            const changedStackPacks = [];
            for (const pack of stackDefinition.packs) {
              if (getDeployedStackPackCommit(stack, pack.pack) !== await this.getPackLastCommit(pack.pack)) {
                if (changedStackPacks.length > 0) {
                  changes.push({
                    stack,
                    packs: changedStackPacks
                  })
                }
              }
            }

          }
        }

        return changes;
      })
  }
}




export default ConfigRepository;
