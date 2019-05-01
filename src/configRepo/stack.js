const piteration = require('p-iteration');
const log = require('../utils/logger');
const git = require('../utils/git');
const Pack = require('./pack');
const { getDeployedStackPack, getDeployedStack, needsRetry } = require('../state');
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
      log.info('Bootstrap mode - only running the following packs:');
      log.info(packs);
    }

    // Instantiate packs
    this.packs = packs.map(
      packDef => new Pack({ packDef, stackName: this.name, configRepoPath })
    );
  }

  async getLastCommit() {
    return this.git
      .log({ file: `stacks/${this.name}` })
      .then(logs => logs.latest.hash)
      .catch(() => undefined);
  }

  async getChanges() {
    // If stack def changed, return all packs as changed
    if (getDeployedStack({ stack: this.name }).commit !== (await this.getLastCommit())) {
      log.debug(`Stack (${this.name}) definiton changed (git commit)`);
      log.trace(`Deployed: ${getDeployedStack({ stack: this.name }).commit}`);
      log.trace(`Compared: ${await this.getLastCommit()}`);
      return this.packs;
    }

    // If stack def didn't change, return a list of individual packs that changed (if any)
    return filter(this.packs, async pack => {
      try {
        const deployedStackDetails = getDeployedStackPack({
          stack: this.name,
          pack: pack.pack
        });

        if ((await pack.getLastCommit()) !== deployedStackDetails.commit) {
          log.debug(
            `Pack '${pack.pack}'' in '${this.name}' stack has changed (git commit)`
          );
          return true;
        }

        if ((await pack.getValuesHash()) !== deployedStackDetails.valuesHash) {
          log.debug(
            `Values for '${pack.pack}'' in '${this.name}' stack have changed (git commit)`
          );
          return true;
        }

        if (needsRetry({ stack: this.name, pack: pack.pack })) {
          log.debug(
            `Will retry '${pack.pack}'' in '${this.name}' due to previous failure`
          );
          return true;
        }
      } catch (error) {
        log.error(error);
        log.error(`Error processing pack ${pack.pack} for changes - skipping`);
        return false;
      }

      return false;
    });
  }
}

module.exports = Stack;
