const minimatch = require('minimatch');
const compareVersions = require('compare-versions');
const semver = require('semver');

/**
 * TODO - this will probably need a good refactor eventually
 * for now, just consolidating the code around tag patterns into one place
 *
 * Types of pattern:
 * `glob` - "Unix style pathname expression, e.g. dev*"
 * `semver` - "Semantic versioning pattern, e.g. v1.0.*"
 * `literal` - "Exact match, e.g. latest"
 */

function splitTypeAndPattern(tagPattern) {
  let [type, pattern] = tagPattern.split(':');
  if (!pattern) {
    pattern = type;
    type = 'literal';
  }
  return { type, pattern };
}

// Does this particular pattern sort semantically
// i.e. doesn't care about created timestamp
function isSemanticSort(tagPattern) {
  const { type } = splitTypeAndPattern(tagPattern);
  if (type === 'semver') return true;
  return false;
}

/**
 * Get filter function for a specified tag_pattern, e.g. 'semver:v1.0.*' or 'glob:*'
 * Filter function will accept tag as either string or object with .tag property
 * */
function getFilter(tagPattern) {
  const { type, pattern } = splitTypeAndPattern(tagPattern);

  // TODO Since semver will (probably?) not care about created timestamp
  // we should be able to filter down to the latest/highest tag sematically?
  if (type === 'semver') {
    return (tag) => {
      const t = semver.coerce(tag.tag ? tag.tag : tag);

      // Value couldn't be coerced into semver
      if (!t) return false;

      return semver.satisfies(t, pattern);
    };
  }

  if (type === 'glob') {
    return tag => minimatch(tag.tag ? tag.tag : tag, pattern);
  }

  if (type === 'literal') {
    return (tag) => {
      const t = tag.tag ? tag.tag : tag;
      return t === pattern;
    };
  }

  return null;
}

// TODO - some patterns may require different type of sort
// e.g. semver sort is probably on the tag itself (like compare-versions)
function getSort(tagPattern) {
  const { type } = splitTypeAndPattern(tagPattern);

  if (type === 'semver') {
    return (a, b) => compareVersions(a.tag, b.tag);
  }

  // Default (for glob, literal)
  return (a, b) => a.created - b.created;
}

module.exports = {
  getFilter,
  getSort,
  isSemanticSort,
};
