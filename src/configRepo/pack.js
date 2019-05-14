const { resolve, join } = require('path');
const SwarmPack = require('swarm-pack');
const yaml = require('js-yaml');
const fs = require('fs-extra');
const deepExtend = require('deep-extend');
const oHash = require('object-hash');
const log = require('../utils/logger');
const { updateTagCache, getNewestTagFromCache } = require('../registry');
const { findKeyInObject } = require('../utils');
const config = require('../config');

const swarmpack = SwarmPack({ config: config.swarmpack });

class Pack {
  constructor({ packDef, stackName, configRepoPath }) {
    this.packDef = packDef;
    this.values = {};

    log.trace('');
    if (packDef.values_file) {
      this.values = yaml.safeLoad(
        fs.readFileSync(
          resolve(configRepoPath, 'stacks', stackName, packDef.values_file),
          'utf8'
        )
      );
    }

    if (packDef.values) {
      this.values = deepExtend({}, this.values, packDef.values);
    }

    this.pack = packDef.pack;
    // Normalize path
    if (
      !packDef.pack.includes('/') &&
      !packDef.pack.includes(':') &&
      !packDef.pack.includes('\\')
    ) {
      // Pack refers to a pack inside the config repo /packs
      this.ref = join(configRepoPath, 'packs', packDef.pack);
    } else {
      this.ref = packDef.pack;
    }
  }

  async getLastCommit() {
    return this.inspect().then(i => i.commit_hash);
  }

  async inspect() {
    return swarmpack.inspectPack(this.ref);
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
    for (const imageDef of findKeyInObject('image', this.values)) {
      if (imageDef.tag_pattern) {
        await updateTagCache(imageDef.repository, imageDef.tag_pattern);
        const newestTag = getNewestTagFromCache(
          imageDef.repository,
          imageDef.tag_pattern
        );
        if (newestTag) {
          imageDef.tag = newestTag;
        } else {
          log.warn(
            `Didn't find tag matching '${imageDef.tag_pattern}' for ${
              imageDef.repository
            }, using default '${imageDef.tag}'`
          );
        }
      }
    }
    return this.values;
  }

  async getValuesHash() {
    return oHash(await this.getPreparedValues());
  }
}

module.exports = Pack;
