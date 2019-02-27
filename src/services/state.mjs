import fs from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';

// TODO - probably will move away from file on volume approach eventually

const stateStoragePath = process.env.SWARM_SYNC_STATE_FILE || false;

let state = {};

if (stateStoragePath) {
  fs.ensureFileSync(stateStoragePath);
  state = Object.assign(state, yaml.safeLoad(fs.readFileSync(path.resolve(stateStoragePath)).toString()));
}

function getDeployedStackPackCommit(stack, pack) {
  return (((state[stack] || {}).packs || {})[pack] || {}).commit || '';
}

function getDeployedStackCommit(stack) {
  return (state[stack] || {}).commit || '';
}

function setDeployedStackCommit(stack, commit) {
  state[stack] = state[stack] || { commit: '', packs: {} }
  state[stack].commit = commit;
  _saveState();
}

function setDeployedStackPackCommit(stack, pack, commit) {
  state[stack] = state[stack] || { commit: '', packs: {} }
  state[stack].packs[pack] = { commit };
  _saveState();
}

function _saveState() {
  if (stateStoragePath) {
    fs.ensureFileSync(stateStoragePath);
    fs.writeFileSync(path.resolve(stateStoragePath), yaml.safeDump(state));
  }
}

export { 
  getDeployedStackPackCommit,
  getDeployedStackCommit,
  setDeployedStackCommit,
  setDeployedStackPackCommit }