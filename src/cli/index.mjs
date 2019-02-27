#!/usr/bin/env node

import { override } from '../config';

/**
 * Module dependencies.
 */

var program = require('commander');

program
  .option('--once', 'Do not run as daemon (default), instead run config repo sync and image update exactly once then exit')
  .parse(process.argv);
  .on("option:once", function() {
    override('once', true)
  })
  .action(require("../index.mjs"));