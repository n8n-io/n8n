#!/usr/bin/env node

import { execSync } from 'node:child_process';

// Skip lefthook install in CI or Docker build
if (process.env.CI || process.env.DOCKER_BUILD) {
	process.exit(0);
}

execSync('./node_modules/.bin/lefthook install', { stdio: 'inherit' });
