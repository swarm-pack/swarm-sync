const config = require('../config');
const { checkForUpdates } = require('../configRepo');
const {
  setDeployedStack,
  setDeployedStackPack,
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

          setDeployedStackPack({
            stack: changedStack.stack.name,
            pack: pack.pack,
            commit: await pack.getLastCommit(),
            valuesHash: await pack.getValuesHash()
          });
        } catch (error) {
          console.log(error);
          console.log(
            `\nFailed deploying ${
              pack.ref
            }. Will not mark as updated and will retry next cycle.`
          );

          // Mark pack as needing retry
          markStackPackForRetry(changedStack.stack.name, pack.pack);
        }
      }
      setDeployedStack({
        stack: changedStack.stack.name,
        commit: await changedStack.stack.getLastCommit()
      });
    }
  } else {
    console.log('No changes in config repository to deploy');
  }
}

module.exports = {
  checkAndDeployRepo
};
