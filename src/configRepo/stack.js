const piteration = require('p-iteration');
const git = require('../utils/git');
const Pack = require('./pack');
const { getDeployedStackPackCommit, getDeployedStackCommit } = require('../state');
const config = require('../config');

const { filter } = piteration;

class Stack {
  constructor({ name, stackDef, configRepoPath }) {
    this.stackDef = stackDef;
    this.name = name;
    this.git = git(configRepoPath);
    let packs = [...stackDef.packs];
    // If bootstrap, we try to look for only swarm-sync pack and exclude others
    if (config.bootstrap) {
      packs = packs.filter(packDef => packDef.pack.includes('swarm-sync'));
      console.log('Bootstrap mode - only running the following packs:');
      console.log(packs);
    }

    // Instantiate packs
    this.packs = packs.map(
      packDef => new Pack({ packDef, stackName: this.name, configRepoPath })
    );
  }

  async getLastCommit() {
    return this.git
      .log({ file: `stacks/${this.name}` })
      .then(log => log.latest.hash)
      .catch(() => undefined);
  }

  async getChanges() {
    // If stack def changed, return all packs as changed
    if (getDeployedStackCommit(this.name) !== (await this.getLastCommit())) {
      return this.packs;
    }

    // If stack def didn't change, return a list of individual packs that changed (if any)
    return filter(
      this.packs,
      async pack =>
        (await pack.getLastCommit()) !== getDeployedStackPackCommit(this.name, pack.pack)
    );
  }
}

module.exports = Stack;
