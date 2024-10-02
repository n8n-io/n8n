#!/usr/bin/env node

import { execSync } from 'node:child_process';
import path from 'node:path';

// Skip lefthook install in CI or Docker build
if (process.env.CI || process.env.DOCKER_BUILD) {
	process.exit(0);
}

const isWindows = process.platform === 'win32';
const lefthookExecutable = isWindows ? 'lefthook.cmd' : 'lefthook';
const executablePath = path.resolve(path.join('./node_modules/.bin/', lefthookExecutable));
execSync(`${executablePath} install`, { stdio: 'inherit' });
