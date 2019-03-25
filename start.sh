#! /bin/sh

echo "LOADING SECRETS..."
source ./env_secrets_expand.sh

if [ "$SSH_PRIVATE_KEY" != "false" ]
then
echo "CREATE ID_RSA FROM SSH_PRIVATE_KEY"
echo "${SSH_PRIVATE_KEY}" > /root/.ssh/id_rsa
chmod 700 /root/.ssh/id_rsa
fi

echo "START THE APP..."
node src/index.js "$@"