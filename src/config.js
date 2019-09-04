const yaml = require('js-yaml');
const fs = require('fs');

// Environment options
const configFilePath = process.env.SWARM_SYNC_CONFIG_FILE || './config/swarm-sync.yml';

// Load config file
const config = yaml.safeLoad(fs.readFileSync(configFilePath, 'utf8'))['swarm-sync'] || {};

// CLI options override
// --bootstrap - run update/deploy only one time, do not start as daemon
config.bootstrap = process.argv.includes('--bootstrap');

// Validations, defaults, transformations etc
if (config.docker.socketPath && config.docker.host) {
  throw new Error(
    'Cannot specify both docker.socketPath & docker.host in configuration.'
  );
}

if (config.docker.host) {
  config.docker.url = `${config.docker.protocol || 'http'}://${
    config.docker.host
  }:${config.docker.port || '2375'}`;
} else {
  config.docker.url = `unix://${config.docker.socketPath || '/var/run/docker.sock'}`;
}

// Create a swarm-pack config to easily pass into swarm-pack
config.swarmpack = {
  docker: config.docker,
  repositories: config.repositories
};

module.exports = config;
