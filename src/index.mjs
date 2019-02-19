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

  const changes = await repo.checkForUpdates();

  if (changes.length) {
    console.log(`Changes found, redeploying ${changes.length} stacks`);

    for (const change of changes) {
      for (const pack of change.packs) {
        console.log(`Running equivalent to: swarm-pack deploy ${repo.getFullPathToPack(pack.pack)} ${change.stack}`);
        await swarmpack.compileAndDeploy({
          stack: change.stack, packDir: repo.getFullPathToPack(pack.pack), values: pack.values,
        });
        setDeployedStackPackCommit(change.stack, pack.pack, await repo.getPackLastCommit(pack.pack));
      }
      setDeployedStackCommit(change.stack, await repo.getStackLastCommit(change.stack));
    }
  } else {
    console.log('No changes in config repository to deploy');
  }
}

async function startCheckAndUpdateImages() {
  const changes = await docker.checkAndUpdateImages();
  if (changes.length > 0) {
    console.log(`${changes.length} service image${changes.length > 1 ? 's' : ''} updated:`);
  } else {
    console.log('No image updates found');
  }
}

async function startUpdates() {
  try {
    await startCheckAndDeployRepo();
    await startCheckAndUpdateImages();
    setTimeout(startUpdates, config.updateInterval);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
}

repo.init().then(() => startUpdates());
