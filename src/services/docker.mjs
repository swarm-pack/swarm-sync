import minimatch from 'minimatch';
import compareVersions from 'compare-versions';
import Docker from 'dockerode';
import drc from 'docker-registry-client';
import config from '../config';

const docker = new Docker({ socketPath: config.docker.socketPath });
const REQUEST_DELAY_MS = 5000;
let started = false;

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function listTags(image) {
  return new Promise((resolve, reject) => {
    const regClient = drc.createClientV2({
      name: image
    });

    regClient.listTags((err, response) => {
      if (err) {
        reject(err);
      }else {
        resolve(response);
      }
    })

  });
}

async function checkUpdateService(service) {
  return Promise.resolve()
    .then(() => drc.parseRepoAndRef(service.current_image))
    .then(image => listTags(image.canonicalName))
    .then(({tags}) => {
      tags = tags
        .filter((t) => minimatch(t, service.pattern))
        .sort(compareVersions);
      const newestTag = tags[tags.length - 1];

      // #TODO - do we want to compareVersions here? May be tricky if patterns are not strictly semver
      if (newestTag !== service.current_image_tag) {
        console.log(
          `Replacing ${service.current_image} with ${
            service.current_image_name
          }:${newestTag}`,
        );

        //Update the service with the newer image
        return docker.getService(service.id).inspect().then((data) => {
          const update = data.Spec;
          update.version = parseInt(data.Version.Index);
          update.TaskTemplate.ContainerSpec.Image = `${service.current_image_name}:${newestTag}`;
          update.TaskTemplate.ForceUpdate = 1;
          return docker.getService(service.id).update(update)
        }).then((data) => {
          return { 
            service: service.name,
            from_image: service.current_image,
            to_image: `${service.current_image_name}:${newestTag}`
          }
        }).catch((err) => {
          Promise.reject(err);
        })
      }else{
        return Promise.resolve();
      }
    })
}

async function checkServices(services) {
  return new Promise( async (resolve, reject) => {
    const updates = [];
    if (services.length > 0 ) {
      for (const [i, service] of services.entries()) {
        await wait(i === 0 ? 0 : config.docker.updateInterval)
          .then(() => checkUpdateService(service))
          .then((result) => {
            if (result && result.to_image) {
              updates.push(service)
            }
          })
      }
      resolve(updates);
    }else {
      resolve();
    }
  })
}

async function checkAndUpdateImages() {
  return docker
    .listServices()
    .then((result) => {
      // Get list of running services
      const managedServices = result
        .filter(
          (service) => service.Spec.Labels['swarm-sync.managed'] === 'true',
        )
        .map((service) => {
          const image = service.Spec.TaskTemplate.ContainerSpec.Image.split(
            '@',
          )[0];
          const imageName = image.split(':')[0];
          const imageTag = image.split(':')[1] || 'latest';

          return {
            id: service.ID,
            name: service.Spec.Name,
            current_image: image,
            current_image_name: imageName,
            current_image_tag: imageTag,
            pattern:
              service.Spec.Labels['swarm-sync.image-pattern'] || 'latest',
          };
        });

      console.log(`Found ${managedServices.length} swarm-sync managed services`);

      return checkServices(managedServices);

    })
    .catch(err => {
      console.log("Encountered error getting list of docker services from endpoint")
      console.log(err);
      process.exit();
    })
}

export default { checkAndUpdateImages };
