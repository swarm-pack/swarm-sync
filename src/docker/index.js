const utf8 = require('utf8');
const Docker = require('dockerode');
const config = require('../config');

const client = new Docker({ socketPath: config.docker.socketPath });

class DockerService {
  constructor(serviceDef) {
    const [currentImage] = serviceDef.Spec.TaskTemplate.ContainerSpec.Image.split('@');
    this.current_image = currentImage;
    const [imageRepo, imageTag] = this.current_image.split(':');
    this.current_image_repo = imageRepo;
    this.current_image_tag = imageTag || 'latest';
    this.id = serviceDef.ID;
    this.name = serviceDef.Spec.Name;
    this.pattern = serviceDef.Spec.Labels['swarm-sync.image-pattern'] || null;

    // dockerode giving us scalar unicode back for some chars.
    // so far only observed issue with labels
    // decoding here should resolve issue
    if (this.pattern) {
      this.pattern = utf8.decode(this.pattern);
    }
  }
}

async function getManagedServices() {
  const serviceData = await client.listServices();
  const managedServices = serviceData
    .filter(s => s.Spec.Labels['swarm-sync.managed'] === 'true')
    .map(s => new DockerService(s));
  return managedServices;
}

async function updateServiceImage(id, image) {
  const serviceData = await client.getService(id).inspect();
  const update = serviceData.Spec;
  update.version = parseInt(serviceData.Version.Index, 10);
  update.TaskTemplate.ContainerSpec.Image = image;
  update.TaskTemplate.ForceUpdate = 1;
  console.log(`Updating service ${id} to image ${image}`);
  return client.getService(id).update(update);
}

module.exports = {
  getManagedServices,
  updateServiceImage,
};
