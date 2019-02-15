import nodeCleanup from 'node-cleanup';
import fs from 'fs-extra';
import ConfigRepo from './services/configRepo';
import SwarmPack from './services/swarmPack';
import docker from './services/docker';
import config from './config';
import { setLastDeployedCommit } from './services/state';

const repo = new ConfigRepo();

nodeCleanup((exitCode, signal) => {
  console.log('Clean up & exit...');
  if (repo.path) {
    fs.emptyDirSync(repo.path);
  }
  process.kill(process.pid, signal);
});

async function startCheckAndDeployRepo() {
  console.log('Polling git repository for changes');
  repo.checkForUpdates().then(({ changed, commit }) => {
    if (changed) {
      console.log(`Commit ${commit} is newer than last known deployed`);
      const swarmpack = new SwarmPack(repo.path);
      return swarmpack.deploy().then(() => setLastDeployedCommit(commit));
    }
    console.log('No changes in config repository to deploy');
    return Promise.resolve();
  }).then(() => {
    setTimeout(startCheckAndDeployRepo, config.git.updateInterval);
  }).catch((err) => {
    console.log(err);
    process.exit();
  });
}

async function startCheckAndUpdateImages() {
  docker.checkAndUpdateImages().then((changes) => {
    if (changes.length > 0) {
      console.log(`${changes.length} service image${changes.length > 1 ? 's' : ''} updated:`);
      console.log(changes);
    } else {
      console.log('No image updates found');
    }
    setTimeout(startCheckAndUpdateImages, config.docker.updateInterval);
  });
}

repo.init()
  .then(() => {
    startCheckAndDeployRepo();
    startCheckAndUpdateImages();
  });
