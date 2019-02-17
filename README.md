# swarm-sync
Flux-like GitOps for Docker Swarm

## Overview

### Diagram

<pre>
    XXX
    XXX                 +----------+            +----------+            +------------+
     X                  | code     |            |          |            | Container  |
   XXXXX    +---------> |   repo   +----------->+    CI    +----------->+   Registry |
     X       commit     |          |   build    |          |   push     |            |
   XXXX                 +----------+            +----------+            +------------+
  X    X                                                                       |
 Developer                                                                     |
                                                                               |
                                                      +------------------------+
                                                      |
                                                      |
    XXX                                               v
    XXX                 +----------+            +-----------+           +------------+
     X                  | config   |            |           |           |  Docker    |
   XXXXX    +---------> |   repo   <----------->+ SwarmSync +----------->    Swarm   |
     X       commit     |          |   sync     |           |   apply   |            |
   XXXX                 +----------+            +-----------+           +------------+
  X    X
 Developer
</pre>


### Components of gitops

There are 3 main components needed to achieve our GitOps pipeline:

1. **Configuration Repository** - a Git repository containing all the configuration for your Docker Swarm stacks. Example repository: [kevb/swarm-pack-example](https://github.com/kevb/swarm-sync-example)

2. **Container Registry** - A Docker registry to push our application images to (hopefully from a CI somewhere else)

3. **SwarmSync** - SwarmSync will be running inside your Swarm as a service and will be configured to point to the other 2 components.

### Swarm-Pack

Swarm-Sync relies on [vudknguyen/swarm-pack](https://github.com/vudknguyen/swarm-pack) to compile and deploy services from templates.

### How it works

- Swarm-sync is configured to point to a configuration repository URL
- *Check if services exist, read labels to ensure they are managed by swarm-sync??*
- Apply the configuration to the Swarm using swarm-pack
- *Annotate services with labels, store history etc??*
- Watch registry for changes to images & update service(s) when new digest available



## Installing

### Quickstart

`docker stack deploy ...`

### Configuration

Config file should be mounted at /etc/swarm-sync.yml and Docker Config or Docker Secret is recommended for this.

Example:

```yaml
swarm-sync:
  git:
    url: git@github.com:kevb/swarm-sync-example
    branch: master
```

### Bootstrapping

How do we bootstrap such that swarm-sync service definition & config is stored in our config repo and managed by swarm-sync??


## Development

Node v10.4.1
Yarn v1.7.0

Install dependencies

```bash
yarn install
```

Start server development

```bash
yarn start
```
