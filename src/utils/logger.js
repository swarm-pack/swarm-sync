const levels = {
  TRACE: 0,
  DEBUG: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4,
  SILENT: 5
};

let currentLevel = 2;

function _log(level, ...args) {
  if (level >= currentLevel) {
    console.log(...args);
  }
}

module.exports = {
  setLevel: level => {
    if (typeof levels[level] === 'number') {
      currentLevel = levels[level];
    } else {
      currentLevel = !Number.isNaN(parseInt(level, 10))
        ? parseInt(level, 10)
        : currentLevel;
    }
  },
  trace: (...args) => _log(levels.TRACE, ...args),
  debug: (...args) => _log(levels.DEBUG, ...args),
  info: (...args) => _log(levels.INFO, ...args),
  warn: (...args) => _log(levels.WARN, ...args),
  error: (...args) => _log(levels.ERROR, ...args)
};
