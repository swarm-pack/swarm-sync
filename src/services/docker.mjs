import minimatch from 'minimatch';
import compareVersions from 'compare-versions';
import Docker from 'dockerode';
import drc from 'docker-registry-client';
import config from '../config';
import { wait } from '../utils';

const docker = new Docker({ socketPath: config.docker.socketPath });
const REQUEST_DELAY_MS = 5000;
let started = false;

// Promise version of drc.listTags
async function listTags(image) {
  return new Promise((resolve, reject) => {
    const regClient = drc.createClientV2({ name: image });
    regClient.listTags((err, response) => err ? reject(err) : resolve(response))
  });
}

async function updateServiceImage(id, image) {

    const serviceData = await docker.getService(id).inspect();
    const update = serviceData.Spec;
    update.version = parseInt(serviceData.Version.Index);
    update.TaskTemplate.ContainerSpec.Image = image;
    update.TaskTemplate.ForceUpdate = 1;

    console.log(`Updating service ${id} to image ${image}`);

    return docker.getService(id).update(update);
}

async function checkUpdateService(service) {

  const image = drc.parseRepoAndRef(service.current_image);
  const tagsData = await listTags(image.canonicalName)
  const tags = tagsData.tags
    .filter((t) => minimatch(t, service.pattern))
    .sort(compareVersions);

  //No matching tags - is it considered an error?
  if (tags.length === 0) {
    console.warn("No tags matched the image update pattern!")
    return false
  }

  const newestTag = tags[tags.length - 1];

  if (newestTag !== service.current_image_tag) {
    await updateServiceImage(service.id, `${service.current_image_name}:${newestTag}`);
    return { 
      service: service.name,
      from_image: service.current_image,
      to_image: `${service.current_image_name}:${newestTag}`
    }
  }
}

async function checkServices(services) {

  const updates = [];

  for (const [i, service] of services.entries()) {
    await wait(i === 0 ? 0 : config.docker.updateInterval)
    const result = await checkUpdateService(service);
    if (result && result.to_image) {
      updates.push(service)
    }
  }

  return updates;
}

async function checkAndUpdateImages() {

  const serviceData = await docker.listServices();
  const managedServices = serviceData
    .filter( s => s.Spec.Labels['swarm-sync.managed'] === 'true')
    .map( s => {
      const image = s.Spec.TaskTemplate.ContainerSpec.Image.split(
        '@',
      )[0];
      const imageName = image.split(':')[0];
      const imageTag = image.split(':')[1] || 'latest';

      return {
        id: s.ID,
        name: s.Spec.Name,
        current_image: image,
        current_image_name: imageName,
        current_image_tag: imageTag,
        pattern:
          s.Spec.Labels['swarm-sync.image-pattern'] || 'latest',
      };
    });

  if (managedServices.length > 0 ) {
    console.log(`Found ${managedServices.length} swarm-sync managed services`);  
    return checkServices(managedServices);
  }else {
    console.log("No swarm-sync managed services found in swarm");
  }
}

export default { checkAndUpdateImages };
