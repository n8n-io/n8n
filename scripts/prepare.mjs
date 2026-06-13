#!/usr/bin/env node

import { execSync } from 'node:child_process';

// Skip prepare steps in CI or Docker build
if (process.env.CI || process.env.DOCKER_BUILD) {
	process.exit(0);
}

// Install lefthook hooks (git commit hooks)
execSync('pnpm lefthook install', { stdio: 'inherit' });

// Best-effort local tbls install (macOS + Homebrew only) for schema docs scripts.
try {
	execSync('node scripts/install-tbls.mjs', { stdio: 'inherit' });
} catch {}
