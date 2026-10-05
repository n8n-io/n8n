#!/usr/bin/env node
/**
 * PROTOTYPE (workspaces) — throwaway. Boots an isolated SQLite n8n with the
 * workspaces prototype and seeds demo data on the first run.
 *
 *   pnpm prototype:workspaces          # start (seeds once)
 *   pnpm prototype:workspaces --reset  # wipe the prototype data and start again
 *
 * The data lives in `.prototype-workspaces-WIPE-ME/` at the repo root. It never
 * touches your normal dev database. Licensed features are turned on through
 * the E2E test controller, so no license key is activated.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { seed } from './seed.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dataDir = path.join(repoRoot, '.prototype-workspaces-WIPE-ME');
const seededMarker = path.join(dataDir, 'seeded');
const port = Number(process.env.PROTOTYPE_PORT ?? 5700);
const baseUrl = `http://localhost:${port}`;

const FEATURES = [
	'feat:sharing',
	'feat:variables',
	'feat:advancedPermissions',
	'feat:projectRole:admin',
	'feat:projectRole:editor',
	'feat:projectRole:viewer',
	'feat:folders',
	'feat:debugInEditor',
	'feat:advancedExecutionFilters',
	'feat:workflowDiffs',
	'feat:namedVersions',
	'feat:personalSpacePolicy',
];

if (process.argv.includes('--reset')) rmSync(dataDir, { recursive: true, force: true });
mkdirSync(dataDir, { recursive: true });
writeFileSync(path.join(dataDir, 'README.txt'), 'PROTOTYPE (workspaces) data. Safe to delete.\n');

// Start from a clean env so the normal dev Postgres, Redis and queue settings never apply.
const env = Object.fromEntries(
	Object.entries(process.env).filter(
		([key]) => !/^(DB_|QUEUE_|N8N_CACHE_|N8N_LICENSE_|EXECUTIONS_MODE)/.test(key),
	),
);
Object.assign(env, {
	N8N_USER_FOLDER: dataDir,
	DB_TYPE: 'sqlite',
	EXECUTIONS_MODE: 'regular',
	N8N_PORT: String(port),
	N8N_RUNNERS_BROKER_PORT: String(port + 1),
	N8N_SECURE_COOKIE: 'false',
	N8N_ENCRYPTION_KEY: 'prototype-workspaces-not-a-secret',
	N8N_DIAGNOSTICS_ENABLED: 'false',
	N8N_PERSONALIZATION_ENABLED: 'false',
	E2E_TESTS: 'true',
	// Allows the editor dev server (`pnpm dev:fe:editor`) to call this backend.
	NODE_ENV: process.env.NODE_ENV ?? 'development',
});

// The cwd is the data dir so `bin/n8n` does not load the dev `.env` (dotenv reads the cwd).
const child = spawn('node', [path.join(repoRoot, 'packages/cli/bin/n8n'), 'start'], {
	cwd: dataDir,
	env,
	stdio: 'inherit',
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', (code) => process.exit(code ?? 0));

async function waitForHealthy() {
	for (let i = 0; i < 240; i++) {
		try {
			const res = await fetch(`${baseUrl}/healthz/readiness`);
			if (res.ok) return;
		} catch {}
		await new Promise((r) => setTimeout(r, 500));
	}
	throw new Error('n8n did not become ready');
}

async function enableFeatures() {
	const patch = async (route, body) =>
		await fetch(`${baseUrl}/rest/e2e/${route}`, {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body),
		});
	for (const feature of FEATURES) await patch('feature', { feature, enabled: true });
	await patch('quota', { feature: 'quota:maxTeamProjects', value: -1 });
}

await waitForHealthy();
await enableFeatures();
if (!existsSync(seededMarker)) {
	await seed(baseUrl);
	writeFileSync(seededMarker, new Date().toISOString());
}
console.log(`
  ┌─ PROTOTYPE: workspaces ─────────────────────────────────────
  │  ${baseUrl}
  │  Every user's password: Prototype123
  │    owner@acme.test   instance owner  (joined Finance, Marketing)
  │    admin@acme.test   instance admin  (joined Marketing)
  │    alice@acme.test   Finance workspace admin
  │    bob@acme.test     editor of Payroll only
  │    carol@acme.test   editor of Invoicing only
  └─────────────────────────────────────────────────────────────
`);
