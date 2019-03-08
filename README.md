# swarm-sync
GitOps for Docker Swarm

## Overview

GitOps, a term coined by [WeaveWorks](https://www.weave.works/blog/gitops-operations-by-pull-request), is a way to do continuous delivery and manage your environments through git using pull requests.

Swarm-sync runs as a service in your Docker Swarm. It watches a Config Repo (a git repository managed by you) for changes and deploys them to your Swarm. Additionally it can watch Docker Registries for new images for your services and update you swarm Services accordingly.

The Config Repo contains a set of [Swarm Packs](https://github.com/swarm-pack/swarm-pack) and configuration values which will be used to set up your Swarm Services.

The best way to understand the Config Repo is by looking at the [**example Config Repo**](https://github.com/swarm-pack/swarm-sync-example).

### Diagram

<pre>
                 +----------+            +----------+            +------------+
 @               | code     |            |          |            | Container  |
-|-  +---------> |   repo   +----------->+    CI    +----------->+   Registry |
/ \   commit     |          |   build    |          |   push     |            |
                 +----------+            +----------+            +------------+
Developer                                                              |
                                                                       |
                                                                       |
                                                +----------------------+
                                                |
                                                |
                                                v
                  +----------+            +-----------+           +------------+
 @                | config   |            |           |           |  Docker    |
-|-  +--------->  |   repo   <----------->+ SwarmSync +----------->    Swarm   |
/ \   commit      |          |   sync     |           |   apply   |            |
                  +----------+            +-----------+           +------------+              
Developer
</pre>


### Components of gitops

There are 3 main components needed to achieve our GitOps pipeline:

1. **Configuration Repository** - a Git repository containing all the configuration for your Docker Swarm stacks. Example repository: [kevb/swarm-pack-example](https://github.com/kevb/swarm-sync-example)

2. **Container Registry** - A Docker registry to push our application images to (hopefully from a CI somewhere else)

3. **SwarmSync** - SwarmSync will be running inside your Swarm as a service and will be configured to point to the other 2 components.

### Swarm-Pack

Swarm-Sync relies on [vudknguyen/swarm-pack](https://github.com/swarm-pack/swarm-pack) to compile and deploy services from templates. An understanding of swarm-pack is required to use swarm-sync, so if you haven't already take a look there.

### Quick-start guide

1. Fork the repo https://github.com/swarm-pack/swarm-sync-example - this guide will use this URL, but you should replace with your own fork and re-configure your own desired config.

2. Create a config file for swarm-sync, similar to this one:

```yaml
swarm-sync:

  # Stacks in target for this swarm-sync instance
  stacks:
    - nonprod

  # Update frequency for polling repo and image registry for changes (ms)
  # Below 1 minute not recommended
  updateInterval: 60000

  # Git details for your Swarm Configuration Repository
  git:
    url: https://github.com/swarm-pack/swarm-sync-example
    branch: master

  # Common config with swarm-pack
  docker:
    socketPath: /var/run/docker.sock
  repositories:
    - name: official
      url: https://github.com/swarm-pack/repository
```

Upload this file to a manager node in your Swarm

3. On the manager node, run

```
docker run -it \
 -v /var/run/docker.sock:/var/run/docker.sock \
 -v /path/to/swarm-sync.yml:/etc/swarm-sync.yml \
 kevbuk/swarm-sync --once
```

This uses the "--once" flag for swarm-sync, meaning it will not run as a daemon. That's because in our example config repo we have a swarm-pack configured for swarm-sync, so it will be deployed as a service. Make sure the swarm-sync config is the same inside your Config Repo values.

4. Check your desired services are now running on your Swarm

```bash
docker service ls
```

5. Push a change to your config repo, and check that the services update themselves within 5 minutes!

### Stacks

Stacks are a way to namespace things, and identify what is in scope for a particular instance of Swarm Sync.

For example, you might have 2 Swarms: **prod** and **nonprod**. One approach is to create corresponding Stacks in your config repo at `stacks/prod` and `stacks/nonprod`. Each Swarm has an instance of swarm-sync with different config files. In your ***prod*** Stack instance, you would have:
```yaml
stacks:
  - prod
```

In your **nonprod** instance you'd have
```yaml
stacks:
  - nonprod
```

With this configuration, the stack defined in `stacks/nonprod/stack.yml` will be synced to your **nonprod** Swarm and the stack defined in `stacks/prod/stack.yml` will be synced to your **prod** Swarm.

### Configuration

Config file should be mounted at /etc/swarm-sync.yml and Docker Config or Docker Secret is recommended for this.

## Development

Node v11.9.0
Yarn v1.7.0

Install dependencies

```bash
yarn install
```

Start server development

```bash
yarn start:dev
```
