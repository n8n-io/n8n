#!/usr/bin/env node
import { execSync, spawnSync } from 'node:child_process';

const mergeBase = process.env.MERGE_BASE;
const cwd = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
const log = (m) => console.log(`[test-changed] ${m}`);
const diff = (range, paths = '') =>
	execSync(`git diff --name-only ${range} ${paths}`.trim(), { cwd, encoding: 'utf-8' }).trim();
const runJest = (extra = []) => {
	const r = spawnSync('jest', [...extra, ...process.argv.slice(2)], { stdio: 'inherit' });
	process.exit(r.status ?? 1);
};

if (!mergeBase) {
	log('MERGE_BASE unset → full');
	runJest();
}

// Turbo --affected can invoke us when only an upstream package changed, in
// which case jest --changedSince would walk an empty in-package diff and run
// zero tests — the one direction we must never take.
const inPackage = diff(`${mergeBase}...HEAD`, '-- packages/nodes-base/');
if (!inPackage) {
	log('upstream-only change → full');
	runJest();
}

if (/\/(jest\.config\.js|test\/(setup|globalSetup)\.ts|package\.json)$/m.test(inPackage)) {
	log('in-package config change → full');
	runJest();
}

const all = diff(`${mergeBase}...HEAD`);
if (/^(pnpm-lock\.yaml|package\.json|packages\/cli\/src\/public-api\/v1\/)/m.test(all)) {
	log('cross-cutting change → full');
	runJest();
}

log(`scoping via jest --changedSince=${mergeBase}`);
runJest([`--changedSince=${mergeBase}`]);
