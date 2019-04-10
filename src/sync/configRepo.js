const config = require('../config');
const { checkForUpdates } = require('../configRepo');
const {
  setDeployedStackCommit,
  setDeployedStackPackCommit,
  markStackPackForRetry
} = require('../state');
const swarmpack = require('swarm-pack')({ config: config.swarmpack });

async function checkAndDeployRepo() {
  console.log('Polling git repository for changes');
  const changedStacks = await checkForUpdates();
  if (changedStacks.length) {
    console.log(`Changes found, redeploying ${changedStacks.length} stacks`);
    for (const changedStack of changedStacks) {
      for (const pack of changedStack.packs) {
        try {
          const values = await pack.getPreparedValues();
          console.log(
            `Running equivalent to: swarm-pack deploy ${pack.ref} ${
              changedStack.stack.name
            }`
          );

          await swarmpack.compileAndDeploy({
            stack: changedStack.stack.name,
            packRef: pack.ref,
            values
          });

          setDeployedStackPackCommit(
            changedStack.stack.name,
            pack.pack,
            await pack.getLastCommit()
          );
        } catch (error) {
          console.log(
            `Failed deploying ${
              pack.ref
            }. Will not mark as updated and will retry next cycle.`
          );

          // Mark pack as needing retry
          markStackPackForRetry(changedStack.stack.name, pack.pack);
        }
      }
      setDeployedStackCommit(
        changedStack.stack.name,
        await changedStack.stack.getLastCommit()
      );
    }
  } else {
    console.log('No changes in config repository to deploy');
  }
}

module.exports = {
  checkAndDeployRepo
};
