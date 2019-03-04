import simpleGit from 'simple-git/promise';

const GIT_SSH_COMMAND = "ssh -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no";

function git(path) {
  return simpleGit(path).env({ ...process.env, GIT_SSH_COMMAND })
}

export default git