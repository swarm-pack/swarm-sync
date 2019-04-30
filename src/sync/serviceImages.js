const log = require('../utils/logger');
const { getManagedServices, updateServiceImage } = require('../docker');
const { updateTagCache, getNewestTagFromCache } = require('../registry');

async function checkAndUpdateImages() {
  const managedServices = await getManagedServices();
  if (managedServices.length === 0) {
    log.info('No swarm-sync managed services found in swarm');
    return;
  }
  log.info(`Found ${managedServices.length} swarm-sync managed services`);

  for (const service of managedServices) {
    if (service.pattern) {
      await updateTagCache(service.current_image_repo, service.pattern);
      const newestTag = getNewestTagFromCache(
        service.current_image_repo,
        service.pattern
      );

      if (newestTag && newestTag !== service.current_image_tag) {
        updateServiceImage(service.id, `${service.current_image_repo}:${newestTag}`);
      }
    }
  }
}

module.exports = {
  checkAndUpdateImages
};
