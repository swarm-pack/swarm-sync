#!/usr/bin/env node

const { override } = require('../config');

/**
 * Module dependencies.
 */

const program = require('commander');

program
  .option('--once', 'Do not run as daemon (default), instead run config repo sync and image update exactly once then exit')
  .parse(process.argv)
  .on('option:once', () => {
    override('once', true);
  })
  .action(require('../index'));
