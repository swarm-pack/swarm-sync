import sh from 'shelljs';
import config from '../config';

class SwarmPack {
  constructor(path) {
    this.path = path;
    if (sh.exec('command -v swarm-pack >/dev/null 2>&1').code !== 0) {
      throw new Error(`swarm-pack must be installed and in PATH`);
    }
  }

  async deploy() {
    return new Promise((resolve, reject) => {
      sh.cd(this.path);
      sh.exec(`swarm-pack deploy -H ${config.docker.host} . ${config.stack}`, function(code, stdout, stderr) {
        code === 0 ? resolve() : reject();
      });
    })
  }

  async test() {
    return new Promise((resolve, reject) => {
      sh.cd(this.path);
      sh.exec('swarm-pack test');
      resolve();
    });
  }
}

export default SwarmPack;
