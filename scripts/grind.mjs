#!/usr/bin/env node
/**
 * Grinds a single vitest file N times in a fresh process per iteration.
 *
 * Spawning per iteration (rather than `vitest --repeat=N`) is intentional:
 * the flakes we target manifest during worker teardown, which only fires
 * at process exit. See DEVP-198 for design notes.
 *
 * Usage:
 *   pnpm grind <test-file> [n]
 *   node scripts/grind.mjs --file <path> --n 10 [--json]
 *
 * Exit code: 0 when all iterations pass, 1 otherwise.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';

const { values, positionals } = parseArgs({
	options: {
		file: { type: 'string' },
		n: { type: 'string' },
		json: { type: 'boolean', default: false },
	},
	allowPositionals: true,
	strict: true,
});

const fileArg = values.file ?? positionals[0];
const n = Number(values.n ?? positionals[1] ?? 10);

if (!fileArg) {
	console.error('usage: grind.mjs <test-file> [n]');
	process.exit(2);
}

const absFile = isAbsolute(fileArg) ? fileArg : resolve(process.cwd(), fileArg);
if (!existsSync(absFile)) {
	console.error(`No such file: ${fileArg}`);
	process.exit(2);
}

/**
 * Walk up from the test file to the nearest package.json so vitest runs
 * inside the package and picks up its config + module aliases. Running
 * `pnpm vitest run <file>` at the monorepo root silently skips the
 * package's vitest config and breaks `@/...` imports.
 */
function findPackageRoot(filePath) {
	let dir = dirname(filePath);
	const stopAt = process.cwd();
	while (true) {
		if (existsSync(resolve(dir, 'package.json'))) return dir;
		const parent = dirname(dir);
		if (parent === dir || dir === stopAt) return null;
		dir = parent;
	}
}

const pkgRoot = findPackageRoot(absFile);
if (!pkgRoot) {
	console.error(`Could not find a package.json above ${absFile}`);
	process.exit(2);
}

const fileRelToPkg = relative(pkgRoot, absFile);

function detectVitest(pkgRootDir) {
	const pkg = JSON.parse(readFileSync(resolve(pkgRootDir, 'package.json'), 'utf8'));
	const deps = { ...pkg.devDependencies, ...pkg.dependencies };
	if (deps.vitest) return true;

	if (/\bvitest\b/.test(pkg.scripts?.test ?? '')) return true;

	return (
		existsSync(resolve(pkgRootDir, 'vitest.config.ts')) ||
		existsSync(resolve(pkgRootDir, 'vitest.config.js')) ||
		existsSync(resolve(pkgRootDir, 'vitest.config.mjs'))
	);
}

if (!detectVitest(pkgRoot)) {
	console.error(`Could not detect vitest in ${pkgRoot}/package.json`);
	process.exit(2);
}

const runnerArgs = ['vitest', 'run', fileRelToPkg, '--reporter=dot'];

let passed = 0;
let firstFailureLogged = false;
for (let i = 0; i < n; i++) {
	const res = spawnSync('pnpm', runnerArgs, {
		cwd: pkgRoot,
		stdio: values.json ? ['ignore', 'ignore', 'pipe'] : ['ignore', 'inherit', 'inherit'],
		encoding: 'utf8',
	});
	if (res.status === 0) {
		passed++;
	} else if (values.json && !firstFailureLogged) {
		// Without this, JSON-mode invocations (used in CI) swallow every
		// vitest error message and leave authors with no diagnostic trail.
		firstFailureLogged = true;
		process.stderr.write(`\n[grind] first failing iteration for ${fileRelToPkg}:\n`);
		if (res.stderr) process.stderr.write(res.stderr);
	}
	if (!values.json) process.stdout.write(res.status === 0 ? '.' : 'F');
}

if (values.json) {
	process.stdout.write(JSON.stringify({ file: fileArg, passed, total: n }) + '\n');
} else {
	console.log(`\n${passed}/${n} passed`);
}

process.exit(passed === n ? 0 : 1);
