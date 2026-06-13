#!/usr/bin/env node

/**
 * Best-effort install of `tbls` (https://github.com/k1LoW/tbls), used by the
 * DB schema docs generator (`pnpm db:schema:docs` / `db:schema:check`).
 *
 * Scope is deliberately narrow: we only auto-install on macOS via
 * Homebrew. On every other platform or when Homebrew is missing, we do
 * nothing, since there's no single simple cross-OS install step. Contributors
 * without tbls can still rely on the Docker fallback in schema-docs.mjs.
 *
 * This must NEVER fail `pnpm install`: every exit path is 0.
 */

import { spawnSync } from 'node:child_process';

const hasBin = (cmd) => !spawnSync(cmd, ['version'], { stdio: 'ignore' }).error;

// Skip in CI / Docker builds (mirrors prepare.mjs); those use the Docker image.
if (process.env.CI || process.env.DOCKER_BUILD) process.exit(0);

// Already installed — nothing to do.
if (hasBin('tbls')) process.exit(0);

// Only macOS + Homebrew is supported for auto-install.
if (process.platform !== 'darwin') process.exit(0);
if (!hasBin('brew')) process.exit(0);

console.log('Installing tbls via Homebrew (used for DB schema docs)…');

const result = spawnSync('brew', ['install', 'tbls'], { stdio: 'inherit' });
if (result.status !== 0) {
	console.log(
		'Could not auto-install tbls — moving on. Install it later with ' +
			'`brew install tbls`, or rely on the Docker fallback.',
	);
}

process.exit(0);
