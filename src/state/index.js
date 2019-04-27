const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');

// TODO - probably will move away from file on volume approach eventually

const stateStoragePath = process.env.SWARM_SYNC_STATE_FILE || false;

let state = {};

if (stateStoragePath) {
  fs.ensureFileSync(stateStoragePath);
  state = Object.assign(
    state,
    yaml.safeLoad(fs.readFileSync(path.resolve(stateStoragePath)).toString())
  );
  console.log(`Using ${stateStoragePath} to store swam state`);
}

function getDeployedStackPack({ stack, pack }) {
  return ((state[stack] || {}).packs || {})[pack] || {};
}

function getDeployedStack({ stack }) {
  return state[stack] || {};
}

function _saveState() {
  if (stateStoragePath) {
    fs.ensureFileSync(stateStoragePath);
    fs.writeFileSync(path.resolve(stateStoragePath), yaml.safeDump(state));
  }
}

function setDeployedStack({ stack, commit }) {
  state[stack] = state[stack] || { commit: '', packs: {} };
  state[stack].commit = commit;
  _saveState();
}

function setDeployedStackPack({ stack, pack, commit, valuesHash }) {
  state[stack] = state[stack] || { commit: '', packs: {} };
  state[stack].packs[pack] = { commit, valuesHash, failures: 0 };
  _saveState();
}

function markStackPackForRetry({ stack, pack }) {
  state[stack] = state[stack] || { commit: '', packs: {} };
  state[stack].packs[pack] = state[stack].packs[pack] || { commit: '', failures: 0 };
  state[stack].packs[pack].failures += 1;
  _saveState();
}

function needsRetry({ stack, pack }) {
  // TODO - we could put a limit to the retry count here...
  return ((((state[stack] || {}).packs || {})[pack] || {}).failures || 0) > 0;
}

module.exports = {
  getDeployedStackPack,
  getDeployedStack,
  setDeployedStack,
  setDeployedStackPack,
  markStackPackForRetry,
  needsRetry
};
