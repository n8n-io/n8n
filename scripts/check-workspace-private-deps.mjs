#!/usr/bin/env node

/**
 * Guards against a broken `npm install n8n`: a publishable (non-private)
 * workspace package must not depend at runtime on a `private` one.
 *
 * The `n8n` cli depends on `n8n-editor-ui` (published), which depended on
 * `@n8n/frontend-constants`, `@n8n/frontend-utils` and `@n8n/telemetry` — all
 * marked `"private": true`. Publishing `n8n` then produces an install graph
 * pointing at packages that were never published. Marking any package private
 * (or adding a private package as a runtime dependency of a published one)
 * silently reintroduces this.
 *
 * We only need to check *direct* runtime deps: if every published package's
 * direct workspace deps are also published, the whole runtime closure is clean
 * by induction. `devDependencies` don't ship, so they're ignored.
 */

import { globSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Pure, testable core. Given the workspace manifests, return violation strings
 * for every non-private package that has a private workspace runtime dep.
 * @param {Array<{name: string, private?: boolean, dependencies?: Record<string,string>}>} manifests
 */
export function findViolations(manifests) {
	const byName = new Map(manifests.map((m) => [m.name, m]));
	const violations = [];
	for (const pkg of manifests) {
		if (pkg.private) continue; // a private package may depend on anything
		for (const [dep, range] of Object.entries(pkg.dependencies ?? {})) {
			if (typeof range !== 'string' || !range.startsWith('workspace:')) continue;
			if (byName.get(dep)?.private) {
				violations.push(`${pkg.name} → ${dep} (${dep} is "private": true)`);
			}
		}
	}
	return violations;
}

function loadManifests() {
	const files = globSync('packages/**/package.json', {
		cwd: root,
		exclude: (p) => p.includes('node_modules'),
	});
	return files.map((rel) => JSON.parse(readFileSync(resolve(root, rel), 'utf8'))).filter((m) => m.name);
}

function main() {
	const violations = findViolations(loadManifests());
	if (violations.length > 0) {
		console.error('');
		console.error('ERROR: publishable packages must not depend on "private" packages at runtime.');
		console.error('');
		console.error('These packages are published to npm, so a private runtime dependency leaves the');
		console.error('published install graph pointing at packages that were never published, breaking');
		console.error('`npm install n8n`.');
		console.error('');
		for (const v of violations) console.error(`  - ${v}`);
		console.error('');
		console.error('Either drop "private": true from the dependency, or move it to devDependencies.');
		console.error('');
		process.exit(1);
	}
	console.log('OK: no publishable package depends on a private package at runtime.');
}

// `--self-test` exercises the core logic without touching the workspace.
if (process.argv.includes('--self-test')) {
	const manifests = [
		{ name: 'pub', dependencies: { priv: 'workspace:*', ok: 'workspace:*' } },
		{ name: 'priv', private: true },
		{ name: 'ok' },
		{ name: 'priv-dep-of-priv', private: true, dependencies: { priv: 'workspace:*' } },
		{ name: 'ext', dependencies: { lodash: '^4' } },
	];
	const v = findViolations(manifests);
	const pass = v.length === 1 && v[0].startsWith('pub → priv');
	console.log(pass ? 'self-test passed' : `self-test FAILED: ${JSON.stringify(v)}`);
	process.exit(pass ? 0 : 1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}
