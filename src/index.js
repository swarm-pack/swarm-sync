#! /usr/bin/env node --experimental-modules
const nodeCleanup = require('node-cleanup');
const config = require('./config');
const { checkAndDeployRepo } = require('./sync/configRepo');
const { checkAndUpdateImages } = require('./sync/serviceImages');

nodeCleanup((exitCode, signal) => {
  console.log('Clean up & exit...');
  process.kill(process.pid, signal);
});

async function startUpdates() {
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
