#!/usr/bin/env node

import { execSync } from 'node:child_process';
import path from 'path';


// Skip lefthook install in CI or Docker build
if (process.env.CI || process.env.DOCKER_BUILD) {
	process.exit(0);
}

const lefthook = path.resolve('node_modules', '.bin', 'lefthook');

execSync(`${lefthook} install`, { stdio: 'inherit' });
