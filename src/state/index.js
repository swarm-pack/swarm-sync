const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const Memory = require('lowdb/adapters/Memory');
const log = require('../utils/logger');

const stateStoragePath = process.env.SWARM_SYNC_STATE_FILE || false;

let adapter;
const opts = { defaultValue: { stacks: {} } };
if (stateStoragePath) {
  adapter = new FileSync(process.env.SWARM_SYNC_STATE_FILE, opts);
} else {
  adapter = new Memory(null, opts);
}

const db = low(adapter);
db.read();

function _ensureStackInDB({ stack }) {
  if (!db.has(`stacks.${stack}`).value()) {
    db.set(`stacks.${stack}`, { commit: '', packs: {} }).write();
  }
}

function _ensureStackPackInDB({ stack, pack }) {
  _ensureStackInDB({ stack });
  if (!db.has(`stacks.${stack}.packs.${pack}`).value()) {
    db.set(`stacks.${stack}.packs.${pack}`, {
      commit: '',
      valuesHash: '',
      failures: 0
    }).write();
  }
}

function setDeployedStack({ stack, commit }) {
  _ensureStackInDB({ stack });
  db.set(`stacks.${stack}.commit`, commit).write();
  log.trace('setDeployedStack', stack, commit);
}

function getDeployedStack({ stack }) {
  _ensureStackInDB({ stack });
  return db.get(`stacks.${stack}`).value();
}

function setDeployedStackPack({ stack, pack, commit, valuesHash }) {
  _ensureStackInDB({ stack });
  db.set(`stacks.${stack}.packs.${pack}`, { commit, valuesHash, failures: 0 }).write();
  log.trace('setDeployedStackPack', stack, pack, commit, valuesHash);
}

function getDeployedStackPack({ stack, pack }) {
  _ensureStackPackInDB({ stack, pack });
  return db.get(`stacks.${stack}.packs.${pack}`).value();
}

function markStackPackForRetry({ stack, pack }) {
  _ensureStackPackInDB({ stack, pack });
  db.update(`stacks.${stack}.packs.${pack}.failures`, n => n + 1).write();
  log.trace('markStackPackForRetry', stack, pack);
}

function needsRetry({ stack, pack }) {
  // TODO - we could put a limit to the retry count here...
  return db.get(`stacks.${stack}.packs.${pack}.failures`).value() > 0;
}

module.exports = {
  getDeployedStackPack,
  getDeployedStack,
  setDeployedStack,
  setDeployedStackPack,
  markStackPackForRetry,
  needsRetry
};
