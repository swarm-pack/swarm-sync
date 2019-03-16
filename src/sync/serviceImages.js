const { getManagedServices, updateServiceImage } = require('../docker');
const { updateTagCache, getNewestTagFromCache } = require('../registry');

async function checkAndUpdateImages() {
  const managedServices = await getManagedServices();
  if (managedServices.length === 0) {
    console.log('No swarm-sync managed services found in swarm');
    return;
  }
  console.log(`Found ${managedServices.length} swarm-sync managed services`);

  for (const service of managedServices) {
    if (service.pattern) {
      await await updateTagCache(service.current_image_repo, service.pattern);
      const newestTag = getNewestTagFromCache(service.current_image_repo, service.pattern);

      if (newestTag && newestTag !== service.current_image_tag) {
        updateServiceImage(service.id, `${service.current_image_repo}:${newestTag}`);
      }
    }
  }
}

module.exports = {
  checkAndUpdateImages,
};
