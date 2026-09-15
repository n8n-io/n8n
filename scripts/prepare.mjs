#!/usr/bin/env node

import { execFileSync, execSync } from 'node:child_process';
import { resolve } from 'node:path';

// Skip lefthook install in CI or Docker build
if (process.env.CI || process.env.DOCKER_BUILD) {
	process.exit(0);
}

execSync('pnpm lefthook install', { stdio: 'inherit' });

// Opt-in anonymous dev-tooling metrics (internal developers only). Best-effort:
// must never break `pnpm install`.
try {
	// execFileSync (no shell) so a checkout path with spaces still works.
	execFileSync('node', [resolve(import.meta.dirname, 'dev-metrics', 'setup.mjs')], {
		stdio: 'inherit',
	});
} catch {
	// ignore — metrics setup is non-essential
}
