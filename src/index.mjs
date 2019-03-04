#! /usr/bin/env node --experimental-modules
import nodeCleanup from 'node-cleanup';
import fs from 'fs-extra';
import swarmpack from 'swarm-pack';
import ConfigRepo from './services/configRepo';
import docker from './services/docker';
import config from './config';
import { setDeployedStackCommit, setDeployedStackPackCommit } from './services/state';

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
  const changedStacks = await repo.checkForUpdates();
  if (changedStacks.length) {
    console.log(`Changes found, redeploying ${changedStacks.length} stacks`);
    for (const changedStack of changedStacks) {
      for (const pack of changedStack.packs) {
        console.log(`Running equivalent to: swarm-pack deploy ${pack.ref} ${changedStack.stack.name}`);
        await swarmpack.compileAndDeploy({
          stack: changedStack.stack.name,
          packRef: pack.ref,
          values: await pack.getPreparedValues(),
        });
        setDeployedStackPackCommit(changedStack.stack.name, pack.pack, await pack.getLastCommit());
      }
      setDeployedStackCommit(changedStack.stack.name, await changedStack.stack.getLastCommit());
    }
  } else {
    console.log('No changes in config repository to deploy');
  }
}


async function startCheckAndUpdateImages() {
  const changes = await docker.checkAndUpdateImages();
  if (changes.length > 0) {
    console.log(`${changes.length} service image${changes.length > 1 ? 's' : ''} updated`);
  } else {
    console.log('No image updates found');
  }
}

async function startUpdates() {
  try {
    await startCheckAndDeployRepo();
    await startCheckAndUpdateImages();
    if (!config.once_only) {
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

repo.init().then(() => startUpdates());
