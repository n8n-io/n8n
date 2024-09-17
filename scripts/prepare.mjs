#!/usr/bin/env node

import { execSync } from 'child_process';

if (process.env.CI) {
	process.exit(0)
}

execSync('./node_modules/.bin/lefthook install', { stdio: 'inherit' });
