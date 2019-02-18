FROM node:11-alpine
# set app port
ENV PORT 80
ENV CONFIG_FILE /etc/swarm-sync.yml
ENV STATE_STORAGE_FILE /run/swarm-sync/state

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

RUN curl -L https://github.com/AGWA/git-crypt/archive/debian/0.6.0.tar.gz | tar zxv -C /var/tmp
RUN cd /var/tmp/git-crypt-debian && make && make install PREFIX=/usr/local && rm -rf /var/tmp/git-crypt-debian

COPY . .

RUN yarn install

RUN ["chmod", "+x", "./start.sh"]
RUN ["chmod", "+x", "./env_secrets_expand.sh"]

# expose port
EXPOSE 80

ENTRYPOINT [ "./start.sh"]