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
  const [type, pattern] = tagPattern.split(':');
  if (!pattern) {
    throw Error(`tag_pattern '${tagPattern}' looks wrong`);
  }
  return { type, pattern };
}

// Does this particular pattern sort semantically
// i.e. doesn't care about created timestamp
function isSemanticSort(tagPattern) {
  return splitTypeAndPattern(tagPattern).type === 'semver';
}

const filters = {
  semver: pattern => tag => {
    const t = semver.clean(tag.tag || tag);
    // If cannot be coerced to a version, filter out
    // If it can, test if it satisfies the pattern
    return t !== null ? semver.satisfies(t, pattern) : false;
  },
  glob: pattern => tag => minimatch(tag.tag || tag, pattern),
  literal: pattern => tag => (tag.tag || tag) === pattern
};

/**
 * Get filter function for a specified tag_pattern, e.g. 'semver:v1.0.*' or 'glob:*'
 * Filter function will accept tag as either string or object with .tag property
 * */
function getFilter(tagPattern) {
  const { type, pattern } = splitTypeAndPattern(tagPattern);
  return filters[type] ? filters[type](pattern) : false;
}

// TODO - some patterns may require different type of sort
// e.g. semver sort is probably on the tag itself (like compare-versions)
function getSort(tagPattern) {
  const { type } = splitTypeAndPattern(tagPattern);

  return type === 'semver'
    ? (a, b) => compareVersions(a.tag, b.tag)
    : (a, b) => a.created - b.created; // Default (for glob, literal)
}

module.exports = {
  getFilter,
  getSort,
  isSemanticSort
};
