import yaml from 'js-yaml';
import fs from 'fs';

const configFilePath = process.env.CONFIG_FILE || './config/swarm-sync.yml';

export default yaml.safeLoad(fs.readFileSync(configFilePath, 'utf8'))[
  'swarm-sync'
];
