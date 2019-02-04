FROM node:10.4-alpine
# set app port
ENV PORT 80

WORKDIR /www
COPY . .

RUN yarn install
RUN yarn run build

RUN ["chmod", "+x", "./start.sh"]
RUN ["chmod", "+x", "./env_secrets_expand.sh"]

# expose port
EXPOSE 80

ENTRYPOINT [ "./start.sh"]
