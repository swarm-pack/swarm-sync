const log = require('../utils/logger');
const config = require('../config');
const { checkForUpdates } = require('../configRepo');
const {
  setDeployedStack,
  setDeployedStackPack,
  markStackPackForRetry
} = require('../state');
const swarmpack = require('swarm-pack')({ config: config.swarmpack });

async function checkAndDeployRepo() {
  log.info('Polling git repository for changes');
  const changedStacks = await checkForUpdates();
  if (changedStacks.length) {
    log.info(`Changes found, redeploying ${changedStacks.length} stacks`);
    for (const changedStack of changedStacks) {
      for (const pack of changedStack.packs) {
        try {
          const values = await pack.getPreparedValues();
          log.debug(
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
          log.error(error);
          log.error(
            `\nFailed deploying ${
              pack.ref
            }. Will not mark as updated and will retry next cycle.`
          );

          log.debug('values: ', await pack.getPreparedValues());

          // Mark pack as needing retry
          markStackPackForRetry({ stack: changedStack.stack.name, pack: pack.pack });
        }
      }
      setDeployedStack({
        stack: changedStack.stack.name,
        commit: await changedStack.stack.getLastCommit()
      });
    }
  } else {
    log.info('No changes in config repository to deploy');
  }
}

module.exports = {
  checkAndDeployRepo
};
