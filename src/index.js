#! /usr/bin/env node
const nodeCleanup = require('node-cleanup');
const config = require('./config');
const { checkAndDeployRepo } = require('./sync/configRepo');
const { checkAndUpdateImages } = require('./sync/serviceImages');

let exit = false; // exit flag for graceful exit
let active = true; // Set to false when 'waiting' between updates, to indicate we can safely exit

nodeCleanup((exitCode, signal) => {
  // Received signal to terminate, likely Docker updating the service
  console.log(`Received signal ${signal} (exitCode ${exitCode})`);
  if (signal === 'SIGTERM' && active) {
    console.log('Waiting for operations to complete before exit...');
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
    await checkAndUpdateImages();
    active = false;
    if (exit) {
      console.log('Operations complete, exiting');
      process.exit(0);
    }
    if (!config.bootstrap) {
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
