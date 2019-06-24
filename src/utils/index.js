/**
 * Async function to wait specific amount of `ms` then resolve a promise (no return value)
 */
async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function rejectDelay(delay) {
  return async function(reason) {
    return new Promise(function(resolve, reject) {
      setTimeout(reject.bind(null, reason), delay);
    });
  };
}

/**
 * retry an async function n times with a delay (including inital delay)
 * retryAsync(myFunction, { maxTries: 5, delay: 2000 }, arg1, arg2,...)
 */
async function retryAsync(fn, opts, ...args) {
  const options = Object.assign({ maxTries: 5, delay: 2000 }, opts);
  let p = Promise.reject();
  for (let i = 0; i < options.maxTries; i += 1) {
    p = p.catch(rejectDelay(options.delay)).catch(() => fn(...args));
  }
  return p;
}

/**
 * Find one or more instances of `key` in `object`, return array of values
 * No guaranteed order for return values. Returns first found in each branch only
 * i.e. assumes `key` doesn't contain a subentry called `key` or if it does, we don't care
 */
function findKeyInObject(key, object) {
  let found = [];
  for (const [objectKey, objectValue] of Object.entries(object)) {
    if (objectKey === key) {
      found.push(objectValue);
    } else if (
      typeof objectValue === 'object' &&
      objectValue !== null &&
      !Array.isArray(objectValue)
    ) {
      found = [...found, ...findKeyInObject(key, objectValue)];
    }
  }
  return found;
}

module.exports = { wait, retryAsync, findKeyInObject };
