#! /bin/sh

echo "LOADING SECRETS..."
source ./env_secrets_expand.sh

echo "CREATE ID_RSA FROM SSH_PRIVATE_KEY"
echo "${SSH_PRIVATE_KEY}" > /root/.ssh/id_rsa
chmod 700 /root/.ssh/id_rsa

echo "START THE APP..."
node --experimental-modules src/index.mjs "$@"