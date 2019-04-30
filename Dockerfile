FROM node:11-alpine
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

WORKDIR /www

RUN apk --update --no-cache add \
   bash \
   ca-certificates \
   curl \
   docker \
   git \
   g++ \
   gnupg \
   make \
   openssh \
   openssl \
   openssl-dev && \
  curl -L https://github.com/AGWA/git-crypt/archive/debian/0.6.0.tar.gz | tar zxv -C /var/tmp && \
  cd /var/tmp/git-crypt-debian && make && make install PREFIX=/usr/local && rm -rf /var/tmp/git-crypt-debian && \
  mkdir -p /root/.ssh

COPY known_hosts /root/.ssh/known_hosts
COPY . .

RUN yarn install && \
    chmod +x ./start.sh && \
    chmod +x ./env_secrets_expand.sh

# expose port
EXPOSE 80

ENTRYPOINT [ "./start.sh"]