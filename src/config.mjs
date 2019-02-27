import yaml from 'js-yaml';
import fs from 'fs';

// Environment options
const configFilePath = process.env.SWARM_SYNC_CONFIG_FILE || './config/swarm-sync.yml';

// Load config file
const config = yaml.safeLoad(fs.readFileSync(configFilePath, 'utf8'))[
  'swarm-sync'
] || {};

// CLI options override
// --once - run update/deploy only one time, do not start as daemon
if (process.argv.includes('--once')) {
  config.once_only = true;
}

// Validations, defaults, transformations etc

if (config.docker.socketPath && config.docker.host) {
  throw new Error('Cannot specify both docker.socketPath & docker.host in configuration.');
}

if (config.docker.host) {
  config.docker.url = `${config.docker.protocol || 'http'}://${config.docker.host}:${config.docker.port || '2375'}`;
} else {
  config.docker.url = `unix://${config.docker.socketPath || '/var/run/docker.sock'}`;
}

export default config;
