import simpleGit from 'simple-git';
import EventEmitter from 'events';
import tmp from 'tmp';
import config from '../config';

class ConfigRepository extends EventEmitter {
  constructor() {
    super();
    this.path = tmp.dirSync();
    this.repo = simpleGit(this.path.name);
    const self = this;

    this.repo
      .clone(config.git.url, this.path.name)
      .then(() => self.emit('initialized'));

    this.checkInterval = setInterval(() => {
      this.repo.pull((err, update) => {
        if (update && update.summary.changes) {
          self.emit('changed');
        }
      });
    }, config.git.updateInterval);
  }

  cleanup() {
    // #TODO delete contents
    this.path.removeCallback();
  }
}

export default ConfigRepository;
