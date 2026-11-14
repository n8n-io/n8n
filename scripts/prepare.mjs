#!/usr/bin/env node

import { execFileSync, execSync } from 'node:child_process';
import { resolve } from 'node:path';

// Skip lefthook install in CI or Docker build
if (process.env.CI || process.env.DOCKER_BUILD) {
	process.exit(0);
}

const [gitDir, commonGitDir] = execFileSync('git', ['rev-parse', '--git-dir', '--git-common-dir'], {
	encoding: 'utf8',
})
	.trim()
	.split(/\r?\n/);

// Linked worktrees share hooks. Install them from the main checkout to avoid concurrent writes.
if (resolve(gitDir) === resolve(commonGitDir)) {
	execSync('pnpm lefthook install', { stdio: 'inherit' });
} else {
	console.log(
		'Skip Lefthook install in a linked worktree. Hooks are shared with the main checkout.',
	);
}

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
