'use strict';

const fs = require('fs');
const { globSync } = require('glob');
const path = require('path');

/**
 * @param {string|string[]} paths Path or array of paths to iterate over
 * @param {Object} [config] Configuration object
 * @param {boolean} [config.recurse=false] Recurse into each directory?
 * @param {RegExp} [config.match] Match files against a regex?
 * @param {string} [config.type] Filter by 'file', 'dir', or 'all' (default)
 * @param {Function} [iterator] Function to run on each file found
 * @return {Object[]} Files found
 */
const list = (paths, ...rest) => {
  const queue = Array.isArray(paths) ? [...paths] : [paths];
  const args = [...rest];

  const config = typeof args[0] === 'object' && Object.keys(args[0]).length ? args.shift() : {};
  config.recurse = config.recurse ?? false;
  config.match = config.match ?? (args[0] instanceof RegExp ? args.shift() : null);

  const iterator = typeof args[0] === 'function' ? args.shift() : null;
  const results = [];

  while (queue.length) {
    const trypath = queue.shift();

    globSync(trypath, { nonegate: true }).forEach(file => {
      const self = {
        path: path.dirname(file),
        full: file,
        file: path.basename(file),
        name: path.basename(file, path.extname(file)),
      };

      Object.defineProperty(self, 'stat', {
        get: () => fs.statSync(self.full),
      });

      const stat = fs.statSync(self.full);

      if (config.recurse && stat.isDirectory()) {
        queue.push(self.full + '/*');
      }

      if (config.match && !file.match(config.match)) return;
      if (config.type === 'file' && !stat.isFile()) return;
      if (config.type === 'dir' && !stat.isDirectory()) return;

      results.push(self);
      if (iterator) iterator.call(self, self);
    });
  }

  return results;
};

module.exports = list;
