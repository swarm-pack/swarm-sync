import path from 'path';
import piteration from 'p-iteration';
import git from '../utils/git';
import Pack from './pack';
import { getDeployedStackPackCommit, getDeployedStackCommit } from '../services/state';
const { filter } = piteration;

class Stack {
  constructor({name, stackDef, configRepoPath}) {
    this.stackDef = stackDef;
    this.name = name;
    this.git = git(configRepoPath);
    // Instantiate packs
    this.packs = stackDef.packs.map(packDef => new Pack({packDef, stackName: this.name, configRepoPath}))
  }

  async getLastCommit() {
    return await this.git.log({ file: `stacks/${this.name}` }).then(log => log.latest.hash).catch(() => undefined);
  }

  async getChanges() {
    // If stack def changed, return all packs as changed
    if (getDeployedStackCommit(this.name) !== this.getLastCommit()) {
      return this.packs;
    }
    // If stack def didn't change, return a list of individual packs that changed (if any)
    return await filter(this.packs, async pack => 
      await pack.getLastCommit() !== getDeployedStackPackCommit(stack.name, pack.pack)
    );
  }

}

export default Stack