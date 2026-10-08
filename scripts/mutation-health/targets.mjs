/**
 * Pure helpers that shape what a run mutates and which tests it runs: source
 * filters, diff ranges, test-file lists and the packages/cli scope rule. No
 * I/O, so the unit tests can drive every rule directly.
 */
import path from 'node:path';

export const repoRoot = path.resolve(import.meta.dirname, '../..');

/**
 * A planned stop. `exitCode` follows the tool's contract: 2 for a usage or
 * config error, 3 when Stryker cannot run. `showUsage` asks the entry point to
 * print the usage text after the message.
 */
export class MutateError extends Error {
	constructor(exitCode, message, { showUsage = false } = {}) {
		super(message);
		this.name = 'MutateError';
		this.exitCode = exitCode;
		this.showUsage = showUsage;
	}
}

// `packages/cli` forks a process per test file and runs a global setup, thus
// Stryker's related-test discovery pulls in hundreds of files and no run
// finishes inside the timeout. An explicit `--test-files` list is required
// there, and the shared default config is swapped for the cli one.
export const CLI_PACKAGE_DIR = 'packages/cli';

// Path comparisons in this file are posix-shaped. `path.relative` gives
// backslashes on Windows, so normalise before matching a package dir.
export function toPosix(p) {
	return p.split(path.sep).join('/');
}

const NON_SOURCE = [
	/\.d\.ts$/,
	/\.(test|spec)\.[cm]?tsx?$/,
	/(^|\/)__(tests|mocks)__\//,
	/\.stories\.[cm]?tsx?$/,
	/\.config\.[cm]?[jt]s$/,
	/(^|\/)(dist|node_modules|coverage)\//,
	/(^|\/)tests?\//,
	/(^|\/)migrations\//,
];

// This is an exclusion list, not a `src/`-only allowlist. nodes-base and
// nodes-langchain keep their code in `nodes/` and `credentials/`. An allowlist
// drops the largest mutable surface in the repo.
export function isMutableSource(repoRelPath) {
	if (!/\.[cm]?tsx?$/.test(repoRelPath)) return false;
	return !NON_SOURCE.some((re) => re.test(repoRelPath));
}

export function changedTestFilesForPackage(changedFiles, packageDir) {
	const prefix = `${toPosix(packageDir).replace(/\/$/, '')}/`;
	return changedFiles
		.map((file) => toPosix(file).replace(/^\.\//, ''))
		.filter((file) => {
			if (!file.startsWith(prefix)) return false;
			const relative = file.slice(prefix.length);
			return (
				(relative.startsWith('src/') || relative.startsWith('test/unit/')) &&
				/\.(test|spec)\.ts$/.test(relative) &&
				!/\.integration\.test\.ts$/.test(relative)
			);
		});
}

// Merge overlapping and adjacent ranges. Stryker then gets one span per region.
export function mergeRanges(ranges) {
	const out = [];
	for (const r of [...ranges].sort((a, b) => a.start - b.start)) {
		const last = out.at(-1);
		if (last && r.start <= last.end + 1) last.end = Math.max(last.end, r.end);
		else out.push({ ...r });
	}
	return out;
}

// Read the new-side line ranges from `git diff -U0` hunk headers.
// `@@ -12,0 +13,4 @@` gives `{ start: 13, end: 16 }`. A new-side count of zero
// is a deletion. No code stays there to mutate, so this drops it.
export function parseHunkRanges(diffText) {
	const ranges = [];
	for (const line of diffText.split('\n')) {
		const m = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
		if (!m) continue;
		const start = Number(m[1]);
		const count = m[2] === undefined ? 1 : Number(m[2]);
		if (count === 0) continue;
		ranges.push({ start, end: start + count - 1 });
	}
	return mergeRanges(ranges);
}

// One label for every target of a run. The summary and the report print it.
export function formatMutateArg(targets) {
	return targets.join(',');
}

export function splitRange(target) {
	const m = /^(.*):(\d+)-(\d+)$/.exec(target);
	return m ? { file: m[1], range: `${m[2]}-${m[3]}` } : { file: target, range: null };
}

/**
 * Flatten the raw `--test-files` values into one list. The flag repeats and
 * each value also takes a comma-separated list, thus `--test-files a,b` and
 * `--test-files a --test-files b` mean the same thing. Blanks are dropped and
 * duplicates collapse, so a repeated path never runs its file twice.
 */
export function parseTestFiles(values) {
	const out = [];
	for (const value of values) {
		for (const part of String(value).split(',')) {
			const file = part.trim();
			if (file && !out.includes(file)) out.push(file);
		}
	}
	return out;
}

/**
 * Stryker runs in the package dir, so it matches test files against paths
 * under that dir, and a test command gets them as paths from there. A
 * repo-relative path (what the user types, and what `--diff` prints) therefore
 * has to lose its package prefix. A path that is already package-relative, and
 * a glob, both pass through untouched.
 */
export function toPackageRelative(file, packageDir) {
	const normalised = toPosix(file).replace(/^\.\//, '');
	const prefix = `${toPosix(packageDir)}/`;
	return normalised.startsWith(prefix) ? normalised.slice(prefix.length) : normalised;
}

// Why a cli target may not run, or null when it may. Named so the message says
// what to do, not only what went wrong.
export function cliScopeError(packageDir, testFiles, diffMode = false) {
	if (toPosix(packageDir) !== CLI_PACKAGE_DIR) return null;
	if (testFiles.length > 0) return null;
	if (diffMode) {
		return (
			`Mutating ${CLI_PACKAGE_DIR} with --diff needs at least one changed test file.\n` +
			'Add or update a test that covers the changed source, or run a named target with --test-files.'
		);
	}
	return (
		`Mutating ${CLI_PACKAGE_DIR} needs --test-files.\n` +
		'Without it Stryker discovers every related test file in the package, forks a ' +
		'process for each one and never finishes. Name the test files that cover the target:\n' +
		'  pnpm mutate packages/cli/src/foo.ts:10-40 --test-files packages/cli/src/__tests__/foo.test.ts'
	);
}

// Which shared config a package gets when it ships none of its own.
export function defaultConfigNameFor(packageDir) {
	return toPosix(packageDir) === CLI_PACKAGE_DIR ? 'stryker.cli.mjs' : 'stryker.default.mjs';
}
