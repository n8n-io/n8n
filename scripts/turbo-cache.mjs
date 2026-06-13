#!/usr/bin/env node
// @ts-check
/**
 * Local, persistent Turbo *remote* cache server (DEVP-262).
 *
 * Stands up a single `ducktors/turborepo-remote-cache` container backed by
 * local filesystem storage, with `--restart unless-stopped` so it survives
 * shell sessions, reboots, and — the whole point — every separate
 * `docker buildx build`. Once it's up, point any build (host or in-image)
 * at it via TURBO_API/TURBO_TOKEN/TURBO_TEAM and Turbo task output is shared
 * across worktrees and across the host↔in-docker boundary.
 *
 * Why this matters: without a shared cache backend, each worktree writes to
 * its own `node_modules/.cache/turbo` and an in-image build starts from an
 * empty filesystem — so neither can ever reuse the other's work. A remote
 * cache is content-addressed and path-independent, so a hit lands wherever
 * the inputs match.
 *
 *   node scripts/turbo-cache.mjs up        # start (idempotent) + write .turbo/config.json
 *   node scripts/turbo-cache.mjs status    # is it up and healthy?
 *   node scripts/turbo-cache.mjs env        # print `export ...` lines  (eval-able)
 *   node scripts/turbo-cache.mjs env --docker   # variant for the in-image docker build
 *   node scripts/turbo-cache.mjs down       # stop + remove container (keeps the cache volume)
 *
 * Host build, any worktree:    eval "$(node scripts/turbo-cache.mjs env)" && pnpm turbo build
 * In-image build (see Dockerfile.inbuild):  node scripts/turbo-cache.mjs env --docker
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CONTAINER = 'n8n-turbo-cache';
const VOLUME = 'n8n-turbo-cache-data';
const IMAGE = 'ducktors/turborepo-remote-cache:latest';
const PORT = process.env.TURBO_CACHE_PORT ?? '3000';
const TOKEN = process.env.TURBO_CACHE_TOKEN ?? 'local-dev';
// Host (glibc) and in-image (musl) builds use distinct team slugs so their
// artefacts never share a cache entry. They are also separated by Turbo's own
// hash (the in-image build sets CI=true, which is in turbo.json globalEnv), so
// this is belt-and-braces, matching the spike's conservative musl/glibc split.
const TEAM_HOST = 'n8n-glibc';
const TEAM_DOCKER = 'n8n-musl';

const REPO_ROOT = resolve(import.meta.dirname, '..');
const API_HOST = `http://localhost:${PORT}`;
// The in-image build container can't reach the host's localhost; on Docker
// Desktop (macOS/Windows) `host.docker.internal` routes back to the host.
const API_DOCKER = `http://host.docker.internal:${PORT}`;

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
			const res = await fetch(`${API_HOST}/v8/artifacts/status`);
			if (res.ok) return true;
		} catch {
			// not up yet
		}
		await new Promise((r) => setTimeout(r, 500));
	}
	return false;
}

function writeTurboConfig() {
	// `.turbo/config.json` is gitignored, so this auto-applies to host builds in
	// THIS worktree without touching git. Turbo reads apiurl + teamslug here; the
	// token still comes from TURBO_TOKEN (see `env`). Run `up` once per worktree.
	const dir = resolve(REPO_ROOT, '.turbo');
	mkdirSync(dir, { recursive: true });
	const cfg = { apiurl: API_HOST, teamslug: TEAM_HOST };
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
	log(`up and healthy at ${API_HOST} (wrote .turbo/config.json for this worktree).`);
	log('Host build:   eval "$(node scripts/turbo-cache.mjs env)" && pnpm turbo build');
	log('Docker build: see docker/images/n8n/Dockerfile.inbuild (run `env --docker` for args).');
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
		log(`health:    ${healthy ? `ok (${API_HOST})` : 'unreachable'}`);
	}
}

function env({ docker: forDocker }) {
	const api = forDocker ? API_DOCKER : API_HOST;
	const team = forDocker ? TEAM_DOCKER : TEAM_HOST;
	// stdout only — so `eval "$(... env)"` works cleanly.
	process.stdout.write(`export TURBO_API=${api}\n`);
	process.stdout.write(`export TURBO_TOKEN=${TOKEN}\n`);
	process.stdout.write(`export TURBO_TEAM=${team}\n`);
	if (forDocker) {
		log('Docker-build args (Docker Desktop reaches the host via host.docker.internal):');
		log('  docker buildx build -f docker/images/n8n/Dockerfile.inbuild \\');
		log(`    --add-host=host.docker.internal:host-gateway --provenance=false --sbom=false \\`);
		log(`    --build-arg TURBO_API=${api} --build-arg TURBO_TEAM=${team} \\`);
		log('    --secret id=TURBO_TOKEN,env=TURBO_TOKEN -t n8n:inbuild .');
	}
}

const cmd = process.argv[2] ?? 'up';
const flags = { docker: process.argv.includes('--docker') };

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
		env(flags);
		break;
	default:
		log(`unknown command "${cmd}". Use: up | down | status | env [--docker]`);
		process.exit(1);
}
