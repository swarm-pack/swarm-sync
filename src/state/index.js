const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');

// TODO - probably will move away from file on volume approach eventually

const stateStoragePath = process.env.SWARM_SYNC_STATE_FILE || false;

let state = {};

if (stateStoragePath) {
  fs.ensureFileSync(stateStoragePath);
  state = Object.assign(state, yaml.safeLoad(fs.readFileSync(path.resolve(stateStoragePath)).toString()));
  console.log(`Using ${stateStoragePath} to store swam state`);
}

function getDeployedStackPackCommit(stack, pack) {
  return (((state[stack] || {}).packs || {})[pack] || {}).commit || '';
}

function getDeployedStackCommit(stack) {
  return (state[stack] || {}).commit || '';
}

function _saveState() {
  if (stateStoragePath) {
    fs.ensureFileSync(stateStoragePath);
    fs.writeFileSync(path.resolve(stateStoragePath), yaml.safeDump(state));
  }
}

function setDeployedStackCommit(stack, commit) {
  state[stack] = state[stack] || { commit: '', packs: {} };
  state[stack].commit = commit;
  _saveState();
}

function setDeployedStackPackCommit(stack, pack, commit) {
  state[stack] = state[stack] || { commit: '', packs: {} };
  state[stack].packs[pack] = { commit };
  _saveState();
}

module.exports = {
  getDeployedStackPackCommit,
  getDeployedStackCommit,
  setDeployedStackCommit,
  setDeployedStackPackCommit,
};
