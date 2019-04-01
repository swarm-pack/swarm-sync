const drc = require('docker-registry-client');
const fs = require('fs-extra');
const yaml = require('js-yaml');
const path = require('path');

const registrySecretsPath = '/run/secrets/registries/';

/** Registry Client for a particular image reference (promisified docker-registry-client) * */
class RegistryClient {
  constructor(repo) {
    this.repo = repo;
    const repoAndRef = drc.parseRepoAndRef(repo);
    const clientConfig = { name: repo };

    // Look for matching secrets
    if (fs.existsSync(path.join(registrySecretsPath, repoAndRef.index.name))) {
      console.log(`Found registry credentials for ${repoAndRef.index.name}`);
      const regAuth = yaml.safeLoad(
        fs.readFileSync(path.join(registrySecretsPath, repoAndRef.index.name), 'utf8')
      );
      if (regAuth && regAuth.username && regAuth.password) {
        clientConfig.username = regAuth.username;
        clientConfig.password = regAuth.password;
      } else {
        console.log(
          `Invalid format for ${path.join(registrySecretsPath, repoAndRef.index.name)}`
        );
      }
    }

    this.drc = drc.createClientV2(clientConfig);
  }

  async listTags() {
    return new Promise((resolve, reject) => {
      this.drc.listTags((err, response) => (err ? reject(err) : resolve(response.tags)));
    });
  }

  async getManifest(opts) {
    return new Promise((resolve, reject) => {
      this.drc.getManifest(opts, (err, response) =>
        err ? reject(err) : resolve(response)
      );
    });
  }

  async getCreated({ ref }) {
    const manifest = await this.getManifest({
      ref,
      acceptManifestLists: true,
      maxSchemaVersion: 1
    });
    if (manifest && manifest.history && manifest.history[0].v1Compatibility) {
      const v1Manifest = JSON.parse(manifest.history[0].v1Compatibility);
      return new Date(v1Manifest.created);
    }
    return null;
  }
}

module.exports = RegistryClient;
