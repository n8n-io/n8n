import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { parseArgs, usageError } from './mutate.mjs';
import { CLI_PACKAGE_DIR, isMutableSource, repoRoot } from './targets.mjs';
import { SAFETY_GREP } from './test-doubles.mjs';

describe('parseArgs', () => {
	it('reads --test-files as a comma-separated list', () => {
		const parsed = parseArgs([
			'packages/cli/src/foo.ts:10-40',
			'--test-files',
			'packages/cli/src/__tests__/foo.test.ts,packages/cli/src/__tests__/bar.test.ts',
		]);
		assert.equal(parsed.targetArg, 'packages/cli/src/foo.ts:10-40');
		assert.deepEqual(parsed.testFiles, [
			'packages/cli/src/__tests__/foo.test.ts',
			'packages/cli/src/__tests__/bar.test.ts',
		]);
	});

	it('reads a repeated --test-files flag', () => {
		const parsed = parseArgs([
			'src/foo.ts',
			'--test-files',
			'src/__tests__/foo.test.ts',
			'--test-files',
			'src/__tests__/bar.test.ts',
		]);
		assert.deepEqual(parsed.testFiles, ['src/__tests__/foo.test.ts', 'src/__tests__/bar.test.ts']);
	});

	it('leaves testFiles empty and testCommand unset when the flags are absent', () => {
		const parsed = parseArgs(['src/foo.ts']);
		assert.deepEqual(parsed.testFiles, []);
		assert.equal(parsed.testCommand, undefined);
	});

	it('reads --test-command as one value, spaces included', () => {
		const parsed = parseArgs(['coverage-options.ts', '--test-command', 'pnpm exec vitest run']);
		assert.equal(parsed.testCommand, 'pnpm exec vitest run');
		assert.equal(parsed.targetArg, 'coverage-options.ts');
	});

	it('reads a --test-command with nothing after it as an empty command', () => {
		assert.equal(parseArgs(['src/foo.ts', '--test-command']).testCommand, '');
	});

	it('keeps reading the other flags', () => {
		const parsed = parseArgs([
			'src/cron.ts',
			'--package-dir',
			'packages/workflow',
			'--config',
			'custom.mjs',
			'--base',
			'upstream/master',
		]);
		assert.equal(parsed.packageDirArg, 'packages/workflow');
		assert.equal(parsed.configArg, 'custom.mjs');
		assert.equal(parsed.baseArg, 'upstream/master');
		assert.equal(parsed.diffMode, false);
	});

	it('defaults the base ref and reads --diff', () => {
		const parsed = parseArgs(['--diff']);
		assert.equal(parsed.diffMode, true);
		assert.equal(parsed.baseArg, 'origin/master');
		assert.equal(parsed.targetArg, undefined);
	});

	it('reads --help', () => {
		assert.equal(parseArgs(['--help']).helpMode, true);
		assert.equal(parseArgs(['-h']).helpMode, true);
		assert.equal(parseArgs(['src/foo.ts']).helpMode, false);
	});

	it('reads a --test-files with nothing after it as no test file', () => {
		assert.deepEqual(parseArgs(['src/foo.ts', '--test-files']).testFiles, []);
	});

	it('does not take an unknown flag as the target', () => {
		assert.equal(parseArgs(['--verbose', 'src/a.ts']).targetArg, 'src/a.ts');
	});

	it('takes the first positional argument as the target', () => {
		assert.equal(parseArgs(['src/a.ts', 'src/b.ts']).targetArg, 'src/a.ts');
	});
});

describe('usageError', () => {
	const args = (argv) => usageError(parseArgs(argv));

	it('accepts a named target and a bare --diff', () => {
		assert.equal(args(['src/a.ts']), null);
		assert.equal(
			args(['src/a.ts', '--test-files', 'a.test.ts', '--test-command', 'pnpm test']),
			null,
		);
		assert.equal(args(['--diff']), null);
	});

	it('wants exactly one of a target and --diff', () => {
		assert.match(args([]), /Missing mutate target/);
		assert.match(args(['--diff', 'src/a.ts']), /--diff takes no positional target/);
	});

	it('refuses --test-files and --test-command with --diff', () => {
		assert.match(
			args(['--diff', '--test-files', 'a.test.ts']),
			/--test-files needs a single target/,
		);
		assert.match(
			args(['--diff', '--test-command', 'pnpm test']),
			/--test-command needs a single target/,
		);
	});

	it('refuses an empty or blank test command', () => {
		assert.match(args(['src/a.ts', '--test-command']), /--test-command needs a command/);
		assert.match(args(['src/a.ts', '--test-command', '  ']), /--test-command needs a command/);
	});
});

// Run the command line in a new process. The timeout stops a case that starts
// a real Stryker run by mistake, so the case fails fast instead of hanging.
function run(args) {
	return spawnSync(process.execPath, [path.join(import.meta.dirname, 'mutate.mjs'), ...args], {
		cwd: path.resolve(import.meta.dirname, '../..'),
		encoding: 'utf8',
		timeout: 30_000,
	});
}

// Each case must stop before Stryker starts, so a mistyped command costs
// nothing instead of forking a process for each of the package's test files.
function assertStopsWith(res, status, pattern) {
	assert.equal(res.signal, null, 'the command did not stop in time');
	assert.equal(res.status, status, res.stderr);
	assert.match(res.stderr, pattern);
	assert.doesNotMatch(res.stderr, /Running Stryker/);
}

const assertUsageError = (res, pattern) => assertStopsWith(res, 2, pattern);

// Run `body` on a temp package with one source file and the given package.json.
function withTempPackage(packageJson, body) {
	const pkgRoot = mkdtempSync(path.join(tmpdir(), 'mutate-cli-'));
	try {
		mkdirSync(path.join(pkgRoot, 'src'));
		writeFileSync(path.join(pkgRoot, 'src/a.ts'), 'export const a = 1;\n');
		writeFileSync(path.join(pkgRoot, 'package.json'), JSON.stringify(packageJson));
		body(pkgRoot);
	} finally {
		rmSync(pkgRoot, { recursive: true, force: true });
	}
}

describe('the cli end to end', () => {
	// The command plans in this repo, so the target must exist. Any source file
	// of packages/cli does: the run stops at the scope check, before Stryker.
	const cliSource = readdirSync(path.join(repoRoot, CLI_PACKAGE_DIR, 'src'))
		.map((name) => `${CLI_PACKAGE_DIR}/src/${name}`)
		.find(isMutableSource);
	const cliTarget = `${cliSource}:1-2`;

	// The message shows how to name the test files, so the usage text is not needed.
	it('exits 2 and names the flag when a cli target has no --test-files', () => {
		const res = run([cliTarget]);
		assertUsageError(res, /^Mutating packages\/cli needs --test-files\./m);
		assert.ok(res.stderr.endsWith(' --test-files packages/cli/src/__tests__/foo.test.ts\n'));
		assert.doesNotMatch(res.stderr, /^Usage:/m);
	});

	it('refuses --test-files and --test-command together with --diff', () => {
		assertUsageError(
			run(['--diff', '--test-files', 'packages/cli/src/__tests__/foo.test.ts']),
			/--diff/,
		);
		assertUsageError(
			run(['--diff', '--test-command', 'pnpm test']),
			/--test-command needs a single target/,
		);
	});

	it('refuses an empty test command and prints the usage', () => {
		const res = run(['packages/@n8n/instance-ai/src/utils/model-config-id.ts', '--test-command']);
		assertUsageError(res, /--test-command needs a command/);
		assert.match(res.stderr, /^Usage:/m);
	});

	// Like the playwright package, which has only a `test:unit` script. A temp
	// package keeps the check from starting Stryker if that package changes.
	it('refuses a package without a vitest test script and points to --test-command', () => {
		withTempPackage({ name: 'no-vitest', scripts: { 'test:unit': 'vitest run' } }, (pkgRoot) => {
			const res = run(['src/a.ts', '--package-dir', pkgRoot]);
			assertUsageError(res, /no-vitest is not a vitest package\n.*--test-command/);
		});
	});

	it('documents the flags in --help', () => {
		const res = run(['--help']);
		assert.equal(res.status, 0);
		assert.match(res.stdout, /--test-files/);
		assert.match(res.stdout, /--test-command <cmd>/);
	});
});

describe('the cli on a crash', () => {
	// A config whose keys cannot be read makes the tool fail with an error that
	// is not a planned stop: a broken tool, not a red gate.
	const cases = {
		'an error': [
			"throw new TypeError('no keys')",
			/\n✗ mutate\.mjs crashed: TypeError: no keys\n {4}at /,
		],
		undefined: ['throw undefined', /\n✗ mutate\.mjs crashed: undefined\n$/],
	};

	for (const [name, [thrown, message]] of Object.entries(cases)) {
		it(`exits 3, never 1, and prints what was thrown when it throws ${name}`, () => {
			withTempPackage({ name: 'pkg', scripts: { test: 'vitest run' } }, (pkgRoot) => {
				const config = path.join(pkgRoot, 'crash.mjs');
				writeFileSync(config, `export default new Proxy({}, { ownKeys() { ${thrown}; } });\n`);
				const res = run(['src/a.ts', '--package-dir', pkgRoot, '--config', config]);
				assertStopsWith(res, 3, message);
			});
		});
	}
});

describe('the tool never writes to the working tree with git', () => {
	const files = readdirSync(import.meta.dirname).filter((file) => file.endsWith('.mjs'));
	// The files the tool runs. The test files and their doubles are not among them.
	const sources = files.filter((file) => !/(\.test|^test-doubles)\.mjs$/.test(file));
	const read = (file) => readFileSync(path.join(import.meta.dirname, file), 'utf8');

	// Comments may tell how the tool worked before. Only code counts. A `//`
	// after a colon is part of a URL, not a comment.
	const withoutComments = (text) =>
		text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

	// git commands that overwrite files or move the work out of the tree.
	const TREE_COMMANDS = '(checkout|restore|stash|reset|clean|switch)';
	const GIT_WRITE = [
		new RegExp(`\\bgit\\b.*\\b${TREE_COMMANDS}\\b`),
		new RegExp(`['"\`]${TREE_COMMANDS}['"\`]`),
	];
	const writesTree = (code) => GIT_WRITE.some((pattern) => pattern.test(code));

	// The command is built from parts, so this file passes the safety grep.
	it('finds each form of a git command that writes to the tree', () => {
		const command = ['git', 'checkout', '--'].join(' ');
		assert.equal(writesTree(`execSync('${command} ' + f)`), true);
		assert.equal(writesTree(`execSync(\`${command} \${f}\`)`), true);
		assert.equal(writesTree("spawnSync('git', ['restore', '--', f])"), true);
		assert.equal(writesTree("spawnSync('git', ['diff', '--name-only', from])"), false);
		assert.equal(writesTree(withoutComments(`// ${command} was the undo`)), false);
	});

	it('has no source file that starts such a command', () => {
		assert.ok(sources.includes('mutate.mjs'));
		for (const file of sources) assert.equal(writesTree(withoutComments(read(file))), false, file);
	});

	// The same check that a person does before a run: grep each .mjs file.
	it('passes the safety grep in every file, tests included', () => {
		for (const file of files) assert.doesNotMatch(read(file), SAFETY_GREP, file);
	});
});
