/**
 * Async function to wait specific amount of `ms` then resolve a promise (no return value)
 */
async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
    }else {
      if (typeof objectValue === 'object') {
        found = [...found, ...findKeyInObject(key, objectValue)]
      }
    }
  }
  return found
}

export { wait, findKeyInObject };