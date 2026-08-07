#!/usr/bin/env node
// @ts-check

/**
 * Resolve changed files → the E2E specs that must run, using the coverage
 * impact map. Prints the janitor select JSON ({ specs, unmapped, mode }).
 *
 *   node select-affected-e2e.mjs <changed-file> [<changed-file> ...]
 *   CHANGED_FILES=a.ts,b.vue node select-affected-e2e.mjs
 *
 * MAP SOURCE SEAM — this is the one spot to change when moving off the committed
 * file. Today the map is the committed snapshot the nightly publishes. To pull
 * it from a remote webhook instead, replace `resolveMapPath()` with a fetch to a
 * temp file. Keep it FAIL-OPEN: on ANY failure return null so selection degrades
 * to BROAD (run everything) — a missing/stale/unreachable map must never cause a
 * test to be skipped.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, accessSync, constants as fsConstants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const JANITOR_CLI = path.resolve(__dirname, '..', '..', 'janitor', 'dist', 'cli.js');
const COMMITTED_MAP = path.join(REPO_ROOT, '.github', 'test-metrics', 'e2e-impact-map.json');

/**
 * @param {{ mapPath?: string }} [opts]
 * @returns {string | null} path to a readable impact map, or null → fail-open broad.
 *
 * Wrapped in try/catch so any I/O failure (race deletion, perms, fs error) is
 * swallowed into a null return — never throws. The caller then omits --map,
 * which makes select-e2e fail open to broad (run the full suite).
 */
export function resolveMapPath(opts = {}) {
	// FUTURE: fetch a remote webhook to a temp file here and return that path;
	// keep the try/catch — return null on failure (fail-open).
	const target = opts.mapPath ?? COMMITTED_MAP;
	try {
		if (!existsSync(target)) return null;
		accessSync(target, fsConstants.R_OK);
		return target;
	} catch {
		return null;
	}
}

/**
 * Build the janitor argv for `select-e2e`. Pure (no I/O) so the wrapper's glue
 * can be tested without spawning a subprocess. If `mapPath` is null we omit
 * `--map`, which makes select-e2e fail open to broad.
 *
 * `base` (the merge-base git ref) lets `select` read changed package.json
 * before/after so a devDependency-only lockfile change drops out of selection.
 * Omitted → `select` keeps the conservative (broad) behaviour for dep changes.
 *
 * @param {{ changedFiles: string, mapPath: string | null, allSpecs?: string, base?: string }} input
 * @returns {string[]}
 */
export function buildArgs({ changedFiles, mapPath, allSpecs, base }) {
	const args = ['select', `--changed-files=${changedFiles}`];
	if (mapPath) args.push(`--map=${mapPath}`);
	if (allSpecs) args.push(`--all-specs=${allSpecs}`);
	if (base) args.push(`--base=${base}`);
	return args;
}

function runAsScript() {
	const changedFiles = process.argv.slice(2).join(',') || process.env.CHANGED_FILES || '';
	const mapPath = resolveMapPath();
	const args = buildArgs({
		changedFiles,
		mapPath,
		allSpecs: process.env.ALL_SPECS_FILE,
		base: process.env.BASE_REF,
	});
	const out = execFileSync('node', [JANITOR_CLI, ...args], { encoding: 'utf-8' });
	process.stdout.write(out);
}

// Only execute when invoked directly — keeps the module importable for tests.
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
	runAsScript();
}
