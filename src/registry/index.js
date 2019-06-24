const NodeCache = require('node-cache');
const log = require('../utils/logger');
const RegistryClient = require('./client');
const patterns = require('./patterns');
const { wait } = require('../utils');
const config = require('../config');

const cache = new NodeCache();

function getCacheKey(repo) {
  return `tags_${repo}`;
}

async function updateTagCache(repo, pattern) {
  // TODO - we might need to sanitize "repo" for cachekey as it probably contains illegal chars
  const cacheKey = getCacheKey(repo);
  const tagCache = cache.get(cacheKey) || [];

  const client = new RegistryClient(repo);
  let tagList = await client.listTags();
  const fetchedAt = new Date();

  if (pattern) {
    tagList = tagList.filter(patterns.getFilter(pattern));
  }

  for (const tag of tagList) {
    if (!tagCache.find(t => t.tag === tag)) {
      const tagEntry = {
        tag,
        firstSeen: fetchedAt
      };

      // Registry client frequently giving bad request error on get manifest
      // Adding try/catch to skip for now
      try {
        if (!patterns.isSemanticSort(pattern)) {
          await wait(config.docker.minRegistryReqInterval);
          tagEntry.created = await client.getCreated({ ref: tag });
        }

        tagCache.push(tagEntry);
      } catch (error) {
        log.warn(`Failed getting tag manifest for ${tag} - skipping`);
        log.trace(error);
      }
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
  getNewestTagFromCache,
  getCachedTags
};
