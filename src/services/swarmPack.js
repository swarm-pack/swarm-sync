import sh from 'shelljs';

class SwarmPack {
  constructor(path) {
    this.path = path;

    //  TODO - add check back later
    // if (sh.exec('swarm-pack').code !== 0) {
    //
    //  throw new Error(`swarm-pack must be installed and in PATH`);
    // }
  }

  deploy() {
    sh.cd(this.path);
    return sh.exec('swarm-pack deploy');
  }

  test() {
    sh.cd(this.path);
    return sh.exec('swarm-pack test');
  }
}

export default SwarmPack;
