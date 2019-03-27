#! /usr/bin/env node
const nodeCleanup = require('node-cleanup');
const config = require('./config');
const { checkAndDeployRepo } = require('./sync/configRepo');
const { checkAndUpdateImages } = require('./sync/serviceImages');

let exit = false;

nodeCleanup((exitCode, signal) => {
  // Received signal to terminate, likely Docker updating the service
  if (signal === 'SIGTERM') {
    console.log('Received SIGTERM, will wait for operations to complete before exit...');
    exit = true;
    return false;
  }

  return true;
});

async function startUpdates() {
  if (exit) {
    console.log('Operations complete, exiting');
    process.exit(0);
  }
  try {
    await checkAndDeployRepo();
    await checkAndUpdateImages();
    if (!config.once_only) {
      console.log(`Waiting ${config.updateInterval / 1000} seconds for next scan.`);
      setTimeout(startUpdates, config.updateInterval);
    } else {
      console.log('Deploying once only, due to configuration');
      process.exit(0);
    }
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
}

startUpdates();
