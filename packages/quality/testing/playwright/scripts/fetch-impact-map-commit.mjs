#!/usr/bin/env node
// @ts-check

/**
 * Fetch the commit that the committed impact map was built from (its `sha`).
 *
 * Line-level E2E selection reads that commit: the map's line numbers refer to it.
 * CI checks out one commit, so this fetches the map commit when it is missing.
 * Every failure only prints a warning and exits 0: without the commit, `select`
 * resolves each file at file level.
 *
 *   node fetch-impact-map-commit.mjs
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const MAP = path.join(REPO_ROOT, '.github', 'test-metrics', 'e2e-impact-map.json');

/** @param {string[]} args */
const git = (args) =>
	execFileSync('git', args, {
		cwd: REPO_ROOT,
		stdio: 'ignore',
		// A fetch must never stall the job: selection works without the commit.
		timeout: 60_000,
		env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
	});

/** @param {string} message */
const warn = (message) => console.log(`::warning::${message}`);

function main() {
	let sha;
	try {
		sha = JSON.parse(readFileSync(MAP, 'utf8')).sha;
	} catch {
		return warn('Could not read the impact map. E2E selection stays file-level.');
	}
	if (typeof sha !== 'string' || !/^[0-9a-f]{40}$/.test(sha)) {
		return console.log('The impact map records no commit. E2E selection stays file-level.');
	}
	try {
		git(['cat-file', '-e', `${sha}^{commit}`]);
		return console.log(`Impact map commit ${sha} is present.`);
	} catch {
		// Not present: fetch it below.
	}
	try {
		git(['fetch', '--no-tags', '--depth=1', 'origin', sha]);
		console.log(`Fetched impact map commit ${sha}.`);
	} catch {
		warn(`Could not fetch impact map commit ${sha}. E2E selection stays file-level.`);
	}
}

main();
