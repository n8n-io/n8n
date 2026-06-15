#!/usr/bin/env node
// @ts-check
/**
 * Local, persistent Turbo *remote* cache server (DEVP-262).
 *
 * Stands up a `ducktors/turborepo-remote-cache` container (--restart
 * unless-stopped) so Turbo output is shared across worktrees — a
 * content-addressed remote cache hits wherever the inputs match, which a
 * per-worktree on-disk cache can't. Run `up` once per worktree; subsequent
 * `pnpm build` in any tree reuses the same task outputs.
 *
 *   up      start (idempotent) + write .turbo/config.json for this worktree
 *   status  is it up and healthy?
 *   env     print eval-able `export ...` lines
 *   down    stop + remove container (keeps the cache volume)
 *
 *   eval "$(node scripts/turbo-cache.mjs env)" && pnpm turbo build
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CONTAINER = 'n8n-turbo-cache';
const VOLUME = 'n8n-turbo-cache-data';
const IMAGE = 'ducktors/turborepo-remote-cache:latest';
const PORT = process.env.TURBO_CACHE_PORT ?? '3000';
const TOKEN = process.env.TURBO_CACHE_TOKEN ?? 'local-dev';
const TEAM = 'n8n-local';

const REPO_ROOT = resolve(import.meta.dirname, '..');
const API = `http://localhost:${PORT}`;

const log = (msg) => process.stderr.write(`[turbo-cache] ${msg}\n`);

/** Run docker, returning trimmed stdout. Throws on non-zero unless `allowFail`. */
function docker(args, { allowFail = false } = {}) {
	const res = spawnSync('docker', args, { encoding: 'utf8' });
	if (res.status !== 0 && !allowFail) {
		throw new Error(`docker ${args.join(' ')} failed:\n${res.stderr || res.stdout}`);
	}
	return (res.stdout ?? '').trim();
}

function assertDocker() {
	const res = spawnSync('docker', ['info'], { stdio: 'ignore' });
	if (res.status !== 0) {
		log('Docker does not appear to be running. Start Docker Desktop and retry.');
		process.exit(1);
	}
}

/** @returns {'running'|'stopped'|'absent'} */
function containerState() {
	const out = docker(['ps', '-a', '--filter', `name=^/${CONTAINER}$`, '--format', '{{.State}}'], {
		allowFail: true,
	});
	if (!out) return 'absent';
	return out.includes('running') ? 'running' : 'stopped';
}

async function waitHealthy(timeoutMs = 30_000) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		try {
			const res = await fetch(`${API}/v8/artifacts/status`);
			if (res.ok) return true;
		} catch {
			// not up yet
		}
		await new Promise((r) => setTimeout(r, 500));
	}
	return false;
}

function writeTurboConfig() {
	// `.turbo/config.json` is gitignored, so this auto-applies to builds in THIS
	// worktree without touching git. Turbo reads apiurl + teamslug here; the token
	// still comes from TURBO_TOKEN (see `env`). Run `up` once per worktree.
	const dir = resolve(REPO_ROOT, '.turbo');
	mkdirSync(dir, { recursive: true });
	const cfg = { apiurl: API, teamslug: TEAM };
	writeFileSync(resolve(dir, 'config.json'), JSON.stringify(cfg, null, 2) + '\n');
}

async function up() {
	assertDocker();
	const state = containerState();
	if (state === 'running') {
		log(`already running (${CONTAINER}).`);
	} else if (state === 'stopped') {
		log(`starting existing container ${CONTAINER}…`);
		docker(['start', CONTAINER]);
	} else {
		log(`creating ${CONTAINER} on port ${PORT} (storage volume ${VOLUME})…`);
		docker([
			'run', '-d',
			'--name', CONTAINER,
			'--restart', 'unless-stopped',
			'-p', `${PORT}:3000`,
			'-v', `${VOLUME}:/data`,
			'-e', 'STORAGE_PROVIDER=local',
			'-e', 'STORAGE_PATH=/data',
			'-e', `TURBO_TOKEN=${TOKEN}`,
			IMAGE,
		]);
	}

	if (!(await waitHealthy())) {
		log('server did not become healthy in time. Check `docker logs n8n-turbo-cache`.');
		process.exit(1);
	}
	writeTurboConfig();
	log(`up and healthy at ${API} (wrote .turbo/config.json for this worktree).`);
	log('Use: eval "$(node scripts/turbo-cache.mjs env)" && pnpm turbo build');
}

function down() {
	assertDocker();
	if (containerState() === 'absent') {
		log('not running.');
		return;
	}
	docker(['rm', '-f', CONTAINER], { allowFail: true });
	log(`removed ${CONTAINER} (cache volume ${VOLUME} kept; \`docker volume rm ${VOLUME}\` to wipe).`);
}

async function status() {
	assertDocker();
	const state = containerState();
	log(`container: ${state}`);
	if (state === 'running') {
		const healthy = await waitHealthy(3_000);
		log(`health:    ${healthy ? `ok (${API})` : 'unreachable'}`);
	}
}

function env() {
	// stdout only — so `eval "$(... env)"` works cleanly.
	process.stdout.write(`export TURBO_API=${API}\n`);
	process.stdout.write(`export TURBO_TOKEN=${TOKEN}\n`);
	process.stdout.write(`export TURBO_TEAM=${TEAM}\n`);
}

const cmd = process.argv[2] ?? 'up';

switch (cmd) {
	case 'up':
		await up();
		break;
	case 'down':
		down();
		break;
	case 'status':
		await status();
		break;
	case 'env':
		env();
		break;
	default:
		log(`unknown command "${cmd}". Use: up | down | status | env`);
		process.exit(1);
}
