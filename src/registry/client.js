const drc = require('docker-registry-client');

/** Registry Client for a particular image reference (promisified docker-registry-client) * */
class RegistryClient {
  constructor(repo) {
    this.repo = repo;
    this.drc = drc.createClientV2({ name: repo });
  }

  async listTags() {
    return new Promise((resolve, reject) => {
      this.drc.listTags((err, response) => (err ? reject(err) : resolve(response.tags)));
    });
  }

  async getManifest(opts) {
    return new Promise((resolve, reject) => {
      this.drc.getManifest(opts, (err, response) => (err ? reject(err) : resolve(response)));
    });
  }

  async getCreated({ ref }) {
    const manifest = await this.getManifest({ ref, acceptManifestLists: true, maxSchemaVersion: 1 });
    if (manifest && manifest.history && manifest.history[0].v1Compatibility) {
      const v1Manifest = JSON.parse(manifest.history[0].v1Compatibility);
      return new Date(v1Manifest.created);
    }
    return null;
  }
}

module.exports = RegistryClient;
