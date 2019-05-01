#! /usr/bin/env node

const nodeCleanup = require('node-cleanup');
const log = require('./utils/logger');
// Init logging
log.setLevel(process.env.SWARM_SYNC_LOGLEVEL || 2);

const config = require('./config');
const { checkAndDeployRepo } = require('./sync/configRepo');
const { checkAndUpdateImages } = require('./sync/serviceImages');

let exit = false; // exit flag for graceful exit
let active = true; // Set to false when 'waiting' between updates, to indicate we can safely exit

nodeCleanup((exitCode, signal) => {
  // Received signal to terminate, likely Docker updating the service
  log.warn(`Received signal ${signal} (exitCode ${exitCode})`);
  if (signal === 'SIGTERM' && active) {
    log.warn('Waiting for operations to complete before exit...');
    exit = true;
    return false;
  }
  // Somethimes process.exit elsewhere gets stuck here and never ends
  // For now, adding this kill to be sure
  process.kill(process.pid, 'SIGKILL');
  return true;
});

async function startUpdates() {
  try {
    active = true;
    await checkAndDeployRepo();

    // OK to exit here if needed as images can be updated in next process
    if (!exit) {
      await checkAndUpdateImages();
    }
    active = false;
    if (exit) {
      log.warn('Operations complete, exiting');
      process.exit(0);
    }
    if (!config.bootstrap) {
      log.info(
        `\n -- Waiting ${config.updateInterval / 1000} seconds for next scan. -- \n`
      );
      setTimeout(startUpdates, config.updateInterval);
    } else {
      log.info('Bootstrap complete');
      process.exit(0);
    }
  } catch (error) {
    log.error('Fatal unhandled exception');
    log.error(error);
    process.exit(1);
  }
}

startUpdates();
