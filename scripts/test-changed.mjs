#!/usr/bin/env node
// Shared CI test scoping script. Consumes CHANGED_FILES from ci-filter and
// dispatches to jest --findRelatedTests or vitest related on the in-package
// subset. Falls back to a full run on empty input or any bailout match.
//
// Usage: node scripts/test-changed.mjs <pkg-dir> [--runner=jest|vitest]
//
// Per-package config lives in each package.json under `n8nTestChanged`:
//   - inPackageBailouts: regex strings matched against in-package file paths.
//     Match → full run (config/setup changes invalidate scoped selection).
//   - crossCuttingBailouts: regex strings matched against all changed files.
//     Defaults to lockfile + root package.json. Match → full run.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const pkgDir = args[0];
const runnerArg = args.find((a) => a.startsWith('--runner=')) ?? '--runner=jest';
const runner = runnerArg.slice('--runner='.length);

if (!pkgDir) {
	console.error('Usage: node scripts/test-changed.mjs <pkg-dir> [--runner=jest|vitest]');
	process.exit(1);
}

if (runner !== 'jest' && runner !== 'vitest') {
	console.error(`Unknown runner: "${runner}". Expected "jest" or "vitest".`);
	process.exit(1);
}

const log = (m) => console.log(`[test-changed] ${m}`);

const pkgJson = JSON.parse(readFileSync(resolve(pkgDir, 'package.json'), 'utf-8'));
const config = pkgJson.n8nTestChanged ?? {};

const changedFiles = (process.env.CHANGED_FILES || '')
	.split('\n')
	.map((f) => f.trim())
	.filter(Boolean);

const runnerCmd = runner === 'vitest' ? 'vitest' : 'jest';
const fullArgs = runner === 'vitest' ? ['run'] : [];
const scopedArgs = (files) =>
	runner === 'vitest'
		? ['related', ...files, '--run']
		: ['--findRelatedTests', ...files];

// shell: false (default) — vitest/jest are on PATH via the pnpm script runner.
// Avoids shell metacharacter interpretation of file path arguments.
const runFull = () => {
	const r = spawnSync(runnerCmd, fullArgs, { stdio: 'inherit' });
	process.exit(r.status ?? 1);
};

if (changedFiles.length === 0) {
	log('no changed-files (master/nightly/release) → full');
	runFull();
}

const inPackage = changedFiles.filter((f) => f.startsWith(`${pkgDir}/`));
if (inPackage.length === 0) {
	log('upstream-only change → full');
	runFull();
}

const inPackageRegexes = (config.inPackageBailouts ?? []).map((p) => new RegExp(p));
if (inPackage.some((f) => inPackageRegexes.some((re) => re.test(f)))) {
	log('in-package bailout match → full');
	runFull();
}

const crossCuttingRegexes = (
	config.crossCuttingBailouts ?? ['^pnpm-lock\\.yaml$', '^package\\.json$']
).map((p) => new RegExp(p));
if (changedFiles.some((f) => crossCuttingRegexes.some((re) => re.test(f)))) {
	log('cross-cutting change → full');
	runFull();
}

const relPaths = inPackage.map((f) => f.slice(pkgDir.length + 1));
log(`scoping via ${runner} ${runner === 'vitest' ? 'related' : '--findRelatedTests'} on ${relPaths.length} files`);

const r = spawnSync(runnerCmd, scopedArgs(relPaths), { stdio: 'inherit' });
process.exit(r.status ?? 1);
