#!/usr/bin/env node
// @ts-check

/**
 * Resolve changed files → the E2E specs that must run, using the coverage
 * impact map. Prints the janitor select-e2e JSON ({ specs, unmapped, mode }).
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
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const JANITOR_CLI = path.resolve(__dirname, '..', '..', 'janitor', 'dist', 'cli.js');
const COMMITTED_MAP = path.join(REPO_ROOT, '.github', 'test-metrics', 'e2e-impact-map.json');

/** @returns {string | null} path to a readable impact map, or null → fail-open broad. */
function resolveMapPath() {
	// FUTURE: fetch a remote webhook to a temp file here and return that path;
	// wrap in try/catch and return null on failure (fail-open).
	return existsSync(COMMITTED_MAP) ? COMMITTED_MAP : null;
}

const changedFiles = process.argv.slice(2).join(',') || process.env.CHANGED_FILES || '';
const mapPath = resolveMapPath();

const args = ['select-e2e', `--changed-files=${changedFiles}`];
// Omitting --map (or pointing at a missing file) makes select-e2e fail open to broad.
if (mapPath) args.push(`--map=${mapPath}`);
const allSpecs = process.env.ALL_SPECS_FILE;
if (allSpecs) args.push(`--all-specs=${allSpecs}`);

const out = execFileSync('node', [JANITOR_CLI, ...args], { encoding: 'utf-8' });
process.stdout.write(out);
