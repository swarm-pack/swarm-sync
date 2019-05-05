FROM node:12-slim
# set app port
ENV PORT 80
# Location of Swarm sync configuration file
ENV SWARM_SYNC_CONFIG_FILE /etc/swarm-sync.yml
# Location where we save state of swarm-sync
ENV SWARM_SYNC_STATE_FILE /run/swarm-sync/state
# Private SSH key used to generate /root/.ssh/id_rsa for private git repos
ENV SSH_PRIVATE_KEY false

# Log level - trace: 0, debug: 1, info: 2, warn: 3, error: 4, silent: 5
ENV SWARM_SYNC_LOGLEVEL 2

WORKDIR /opt

RUN curl -fsSL https://download.docker.com/linux/debian/gpg | apt-key add - && \
    apt-get update && \
    apt-get install -y apt-transport-https && \
    echo "deb https://download.docker.com/linux/debian stretch stable" | \
      tee /etc/apt/sources.list.d/docker.list && \
    curl https://download.docker.com/linux/debian/gpg | apt-key add - && \
    apt-get update && \
    apt-get install -y \
      docker-ce-cli ssh libssl-dev make g++ gnupg git && \
    curl -L https://github.com/AGWA/git-crypt/archive/0.6.0.tar.gz | tar zxv -C /var/tmp && \
    cd /var/tmp/git-crypt-0.6.0 && make && make install PREFIX=/usr/local && rm -rf /var/tmp/git-crypt-0.6.0 && \
    mkdir -p /root/.ssh

COPY known_hosts /root/.ssh/known_hosts
COPY . .

RUN npm install --production && \
    chmod +x ./start.sh && \
    chmod +x ./env_secrets_expand.sh

# expose port
EXPOSE 80

ENTRYPOINT [ "./start.sh"]