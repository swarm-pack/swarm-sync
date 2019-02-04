import minimatch from 'minimatch';
import compareVersions from 'compare-versions';
import Docker from 'dockerode';
import drc from 'docker-registry-client';
import config from '../config';

const docker = new Docker({ socketPath: config.docker.socketPath });
const REQUEST_DELAY_MS = 3000;
let started = false;

function scan() {
  // End loop if not started
  if (!started) return;

  console.log('Scanning services in Swarm...');

  docker
    .listServices()
    .then((result) => {
      // Get list of running services
      const managedServices = result
        .filter(
          (service) => service.Spec.Labels['swarm-stack.managed'] === 'true',
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
              service.Spec.Labels['swarm-stack.image-pattern'] || 'latest',
          };
        });

      console.log(
        `Swarm-sync managing ${result.length} of ${
          managedServices.length
        } total services`,
      );

      function checkForNewImages() {
        const service = managedServices.pop();
        const regRepoRef = drc.parseRepoAndRef(service.current_image);
        const regClient = drc.createClientV2({
          name: regRepoRef.canonicalName,
        });

        regClient.listTags(function(err, response) {
          let { tags } = response;
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

            // #TODO - update service
          }

          if (managedServices.length > 0) {
            // Call self with remaining images
            setTimeout(() => checkForNewImages(), REQUEST_DELAY_MS);
          } else {
            // Set up next scan cycle
            setTimeout(scan, config.docker.updateInterval);
          }
        });
      }

      checkForNewImages();
    })
    .catch(() => {
      throw new Error(
        'Could not get a list of services from this Docker endpoint',
      );
    });
}

function startScan() {
  if (!started) {
    started = true;
    scan();
  }
}

function stopScan() {
  started = false;
}

export { startScan, stopScan };
