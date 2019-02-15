import fs from 'fs-extra';
import path from 'path';

// TODO - probably will move away from file on volume approach eventually

const stateStoragePath = process.env.STATE_STORAGE_FILE || false;
let lastDeployedCommit = '';

if (stateStoragePath) {
  fs.ensureFileSync(stateStoragePath);
  lastDeployedCommit = fs.readFileSync(path.resolve(stateStoragePath)).toString();
}

function getLastDeployedCommit() {
  return lastDeployedCommit;
}

function setLastDeployedCommit(commit) {
  lastDeployedCommit = commit;
  if (stateStoragePath) {
    fs.writeFileSync(path.resolve(stateStoragePath), commit);
  }
}

export { getLastDeployedCommit, setLastDeployedCommit }