#!/usr/bin/env node
// @ts-check

/**
 * Coverage shard runner — the coverage caller's test-command.
 *
 * Runs the Playwright coverage project, then resolves THIS shard's raw V8 to a
 * small lcov + per-spec lcovs. Keeping this here (not as steps in
 * test-e2e-reusable.yml) leaves the shared E2E workflow coverage-agnostic: it
 * just runs the test-command and uploads coverage/, same as any other shard.
 *
 * Args after the script (e.g. `--workers=1 <specs>`, appended by the reusable)
 * are forwarded to Playwright. Coverage resolution is best-effort and never
 * masks the test exit code.
 */

import { execFileSync, spawnSync } from 'node:child_process';

const forwarded = process.argv.slice(2);
const sh = (cmd, args, env = {}) =>
	spawnSync(cmd, args, { stdio: 'inherit', env: { ...process.env, ...env } });

// 1. Run the coverage project (forward workers/specs from the reusable).
const test = sh('pnpm', ['test:container:coverage', ...forwarded]);

// 2. Resolve coverage — best-effort, even when tests failed (we still want the data).
try {
	const image = process.env.TEST_IMAGE_N8N ?? 'n8nio/n8n:local';
	// Backend V8 files are written by the container as uid 1000 / mode 0600.
	spawnSync('sudo', ['chmod', '-R', 'a+rwX', 'coverage/.backend-v8'], { stdio: 'ignore' });
	// Extract the image's built dist (.js + .js.map) for backend source resolution.
	const cid = execFileSync('docker', ['create', image]).toString().trim();
	execFileSync('rm', ['-rf', 'img-dist']);
	execFileSync('docker', ['cp', `${cid}:/usr/local/lib/node_modules/n8n`, './img-dist']);
	execFileSync('docker', ['rm', cid], { stdio: 'ignore' });
	sh('pnpm', ['coverage:emit-shard'], {
		IMAGE_DIST_ROOT: `${process.cwd()}/img-dist`,
		N8N_COVERAGE_DIR: `${process.cwd()}/coverage/.backend-v8`,
		// monocart's generate() is memory-hungry; containers are stopped, RAM is free.
		NODE_OPTIONS: '--max-old-space-size=12288',
	});
	sh('pnpm', ['coverage:emit-spec-lcovs']);
	// Per-spec BACKEND lcovs (DEVP-370) — needs the image dist for dist→.ts resolution.
	sh('pnpm', ['coverage:emit-spec-backend-lcovs'], {
		IMAGE_DIST_ROOT: `${process.cwd()}/img-dist`,
		NODE_OPTIONS: '--max-old-space-size=12288',
	});
} catch (error) {
	console.error('coverage emit failed (non-fatal):', String(error));
} finally {
	// img-dist is the docker-cp'd image tree; its nested package.json files get
	// picked up as pnpm workspace packages and break a later `pnpm install
	// --frozen-lockfile` (e.g. build:docker). Ephemeral in CI; clean it for local.
	execFileSync('rm', ['-rf', 'img-dist']);
}

process.exit(test.status ?? 1);
