#!/usr/bin/env node

import { runCLI } from '../src/cli.js';

runCLI().then(exitCode => {
  process.exit(exitCode);
}).catch(err => {
  console.error('Fatal DriftLens error:', err);
  process.exit(1);
});
