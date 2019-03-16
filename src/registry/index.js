const NodeCache = require('node-cache');
const RegistryClient = require('./client');
const patterns = require('./patterns');
const { wait } = require('../utils');
const config = require('../config');

const cache = new NodeCache();

function getCacheKey(repo) {
  return `tags_${repo}`;
}

// TODO - We don't currently handle server errors, retries etc. Rate limiting not yet tuned...
// TODO - This implementation assumes tags are immutable. This assumption needs to be confirmed.
async function updateTagCache(repo, pattern) {
  // TODO - we might need to sanitize "repo" for cachekey as it probably contains illegal chars
  const cacheKey = getCacheKey(repo);
  const tagCache = cache.get(cacheKey) || [];
  const client = new RegistryClient(repo);
  let tagList = await client.listTags();
  const fetchedAt = new Date();

  console.log(`Updating image tag cache for ${repo}...`);

  if (pattern) {
    const filter = patterns.getFilter(pattern);
    tagList = tagList.filter(filter);
  }

  for (const tag of tagList) {
    if (!tagCache.find(t => t.tag === tag)) {
      const tagEntry = {
        tag,
        firstSeen: fetchedAt
      };

      if (!patterns.isSemanticSort(pattern)) {
        console.log(`fetching manifest for ${tag}`);
        await wait(config.docker.minRegistryReqInterval);
        tagEntry.created = await client.getCreated({ ref: tag });
      }

      tagCache.push(tagEntry);
    }
  }
  cache.set(cacheKey, tagCache);
}

function getCachedTags(repo, pattern) {
  const tagCache = cache.get(getCacheKey(repo)) || [];
  return pattern ? tagCache.filter(patterns.getFilter(pattern)) : tagCache;
}

function getNewestTagFromCache(repo, pattern) {
  const tagCache = getCachedTags(repo, pattern);
  tagCache.sort(patterns.getSort(pattern));

  if (tagCache.length) {
    return tagCache[tagCache.length - 1].tag;
  }
  return null;
}

module.exports = {
  updateTagCache,
  getNewestTagFromCache
};
