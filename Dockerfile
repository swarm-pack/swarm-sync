FROM node:11-alpine
# set app port
ENV PORT 80
# Location of Swarm sync configuration file
ENV SWARM_SYNC_CONFIG_FILE /etc/swarm-sync.yml
# Location where we save state of swarm-sync
ENV SWARM_SYNC_STATE_FILE /run/swarm-sync/state
# Private SSH key used to generate /root/.ssh/id_rsa for private git repos
ENV SSH_PRIVATE_KEY false

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
   openssl-dev

RUN curl -L https://github.com/AGWA/git-crypt/archive/debian/0.6.0.tar.gz | tar zxv -C /var/tmp && \
    cd /var/tmp/git-crypt-debian && make && make install PREFIX=/usr/local && rm -rf /var/tmp/git-crypt-debian && \
    mkdir -p /root/.ssh

COPY . .
COPY known_hosts /root/.ssh/known_hosts

RUN yarn install

RUN ["chmod", "+x", "./start.sh"]
RUN ["chmod", "+x", "./env_secrets_expand.sh"]

# expose port
EXPOSE 80

ENTRYPOINT [ "./start.sh"]