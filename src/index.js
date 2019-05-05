#! /usr/bin/env node
const log = require('./utils/logger');
// Init logging
log.setLevel(process.env.SWARM_SYNC_LOGLEVEL || 2);

const config = require('./config');
const { checkAndDeployRepo } = require('./sync/configRepo');
const { checkAndUpdateImages } = require('./sync/serviceImages');

let exit = false; // exit flag for graceful exit
let active = true; // Set to false when 'waiting' between updates, to indicate we can safely exit

process.on('SIGTERM', () => {
  // Received signal to terminate, likely Docker updating the service
  log.warn(`Received SIGTERM signal`);
  if (active) {
    exit = true;
    log.warn('Waiting for operations to complete before exit...');
  } else {
    process.exit(0);
  }
});

async function startUpdates() {
  try {
    active = true;
    if (!exit) await checkAndDeployRepo();
    if (!exit) await checkAndUpdateImages();
    active = false;
  } catch (error) {
    log.error('Fatal unhandled exception');
    log.error(error);
    process.exit(1);
  }

  // Exit if we got a SIGTERM earlier
  if (exit) {
    log.warn('Operations complete, exiting');
    process.exit(0);
  }

  // Either loop again or exit if bootstrap mode
  if (!config.bootstrap) {
    log.info(
      `\n -- Waiting ${config.updateInterval / 1000} seconds for next scan. -- \n`
    );
    setTimeout(startUpdates, config.updateInterval);
  } else {
    log.info('Bootstrap complete');
    process.exit(0);
  }
}

startUpdates();
