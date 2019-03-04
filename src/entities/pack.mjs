import { join } from 'path';
import swarmpack from 'swarm-pack';
import docker from '../services/docker';
import { findKeyInObject } from '../utils';

class Pack {
  constructor({packDef, configRepoPath}) {
    this.packDef = packDef;
    this.values = packDef.values;
    this.pack = packDef.pack;
    // Normalize path
    if (!packDef.pack.includes("/") && !packDef.pack.includes(":") && !packDef.pack.includes("\\")) {
      // Pack refers to a pack inside the config repo /packs
      this.ref = join(configRepoPath, 'packs', packDef.pack)
    }else {
      this.ref = packDef.pack
    }
  }

  async getLastCommit() {
    return await this.inspect().then(i => i.commit_hash);
  }

  async inspect() {
    return await swarmpack.inspectPack(this.ref);
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
  async getPreparedValues() {
    if (!this.values) return {};
    for (let imageDef of findKeyInObject('image', this.values)) {
      if (imageDef['tag_pattern']) {
        imageDef.tag = await docker.getLatestTag(imageDef.repository, imageDef.tag_pattern);
      }
    }
    return this.values;
  }

}

export default Pack
