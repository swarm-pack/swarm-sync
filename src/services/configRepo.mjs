import simpleGit from 'simple-git/promise';
import tmp from 'tmp';
import sh from 'shelljs';
import config from '../config';
import { getLastDeployedCommit } from './state'

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

  async getCommitHash() {
    return this.repo.revparse(['HEAD']).then(rev => rev.trim())
  }

  // Git pull, then compare HEAD commit with currently deployed state
  async checkForUpdates() {
    return this.repo.pull()
      .then(() => this.gitCryptUnlock())
      .then(() => this.getCommitHash())
      .then((commit) => ({ changed: getLastDeployedCommit() !== commit, commit }))
  }
}




export default ConfigRepository;
