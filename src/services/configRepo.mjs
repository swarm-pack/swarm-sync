import simpleGit from 'simple-git/promise';
import tmp from 'tmp';
import sh from 'shelljs';
import yaml from 'js-yaml';
import fs from 'fs-extra';
import { resolve, basename } from 'path';
import config from '../config';
import { getDeployedStackPackCommit, getDeployedStackCommit } from './state';
import { findKeyInObject } from '../utils';

const GIT_SSH_COMMAND = "ssh -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no";

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

  getSecretsDir(stack) {
    return resolve(this.path, 'stacks', stack, 'secrets');
  }

  async getStackLastCommit(stack) {
    return this.repo.log({ file: `stacks/${stack}` }).then(log => log.latest.hash)
  }

  async getPackLastCommit(pack) {
    return this.repo.log({ file: `packs/${pack}` }).then(log => log.latest.hash)
  }

  /**
   * Like Helm/Flux we interpret some specific structures in values
   * and automatically process them in a specific way
   * https://github.com/stefanprodan/gitops-helm
   *
   * image:
   *   repository: ngninx
   *   tag: 1.4.1
   *   tag_pattern: 1.4.*
   *
   *  In this instance tag_pattern will be matched in registry and the latest matching
   *  tag will replace `tag` in values when passed into swarm-pack
   */
  async preparePackValues(values={}) {
    if (!values) return {};
    for (let imageDef of findKeyInObject('image', values)) {
      if (imageDef.hasOwnProperty('tag-pattern')) {
        imageDef.tag = await docker.getLatestTag(imageDef.image, imageDef.tag_pattern);
      }
    }

    return values;
  }

  async checkForUpdates() {

    await this.repo.pull();
    await this.gitCryptUnlock();
    const stacks = await fs.readdir(resolve(this.path, 'stacks'));
    const packs = await fs.readdir(resolve(this.path, 'packs'));
    // TODO - maybe want to handle if directory is messy. 
    // For now, assume it only contains name stack / packs dirs.


    // Stacks in target are defined in config.stacks, and have a corresponding stacks/[stack-name]/stack.yml in the repo
    const targetStacks = stacks.filter(s => s.includes(config.stacks));
    console.log(`Target stacks found: ${targetStacks.join(',')}`);

    // Changes [{stack: 'foo', packs: 'bar'}] is a list of stacks (and it's packs) that changed
    const changes = [];

    for (const stack of targetStacks) {
      const stackDefinition = yaml.safeLoad(fs.readFileSync(resolve(this.path, 'stacks', stack, 'stack.yml'), 'utf8'));

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
            changedStackPacks.push(pack)
          }
        }

        //If any changes in any individual pack, add as changes
        if (changedStackPacks.length > 0) {
          changes.push({
            stack,
            packs: changedStackPacks
          })
        }
      }
    }
    return changes;
  }
}




export default ConfigRepository;
