import nodeCleanup from 'node-cleanup';
import ConfigRepo from './services/configRepo';
// import SwarmPack from './services/swarmPack';
import { startScan } from './services/docker';

let repo;

nodeCleanup((/* exitCode, signal */) => {
  if (repo) {
    repo.cleanup();
  }
});

repo = new ConfigRepo();

repo.on('initialized', () => {
  console.log('Initialized');
  // const sp = new SwarmPack(repo.path);
  startScan();
});

repo.on('changed', () => {
  console.log('Changed');
});
