import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	realpathSync,
	rmSync,
	statSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
	COMPAT_RUNNER_PLUGIN,
	NO_TSCONFIG_REWRITE,
	RAW_REPORT,
	buildStrykerConfig,
	loadBaseConfig,
	resolveConfig,
	resolveStrykerBin,
	runnerIncrementalFile,
	sandboxConfigError,
	strykerRunArgv,
	toCommandLine,
	writeRunConfig,
} from './stryker.mjs';
import { MutateError } from './targets.mjs';
import { IN_PLACE_KEY, namesInPlaceMode } from './test-doubles.mjs';

const VITEST_PLUGIN = '@stryker-mutator/vitest-runner';
// The shape of the shared default config, for the fields this file overrides.
const SHARED_DEFAULT = {
	testRunner: 'vitest',
	plugins: [VITEST_PLUGIN],
	reporters: ['progress', 'clear-text', 'html', 'json'],
	coverageAnalysis: 'perTest',
	ignoreStatic: true,
	jsonReporter: { fileName: 'reports/mutation/raw.json' },
};

describe('buildStrykerConfig with the vitest runner', () => {
	it('puts the supplied test files in the testFiles config field', () => {
		const config = buildStrykerConfig({
			targets: ['src/credentials/external-secrets.utils.ts:32-68'],
			testFiles: ['src/credentials/__tests__/external-secrets.utils.test.ts'],
		});
		assert.deepEqual(config.testFiles, [
			'src/credentials/__tests__/external-secrets.utils.test.ts',
		]);
		assert.deepEqual(config.mutate, ['src/credentials/external-secrets.utils.ts:32-68']);
	});

	// An empty `testFiles` is not the same as an absent one: Stryker reads a
	// non-empty list as "run only these", so an empty one must not be sent.
	it('leaves testFiles out when no test file was named', () => {
		const config = buildStrykerConfig({ targets: ['src/cron.ts'] });
		assert.equal('testFiles' in config, false);
	});

	// The plain runner kills no mutant under Vitest 5. See vitest-compat.mjs.
	it('swaps the plain vitest runner for vitest-compat and loads its plugin once', () => {
		const config = buildStrykerConfig({ base: SHARED_DEFAULT, targets: ['src/a.ts'] });
		assert.equal(config.testRunner, 'vitest-compat');
		assert.deepEqual(config.plugins, [VITEST_PLUGIN, COMPAT_RUNNER_PLUGIN]);
		assert.equal(config.coverageAnalysis, 'perTest');
	});

	it('keeps the fields of a package config, such as its vitest config file', () => {
		const base = {
			...SHARED_DEFAULT,
			vitest: { configFile: 'vitest.stryker.config.ts' },
			timeoutMS: 15_000,
		};
		const config = buildStrykerConfig({ base, targets: ['src/a.ts'] });
		assert.deepEqual(config.vitest, { configFile: 'vitest.stryker.config.ts' });
		assert.equal(config.timeoutMS, 15_000);
	});

	// A config can already name the compat runner, and Stryker still has to load it.
	it('loads the compat plugin for a config that names the vitest-compat runner', () => {
		const config = buildStrykerConfig({
			base: { testRunner: 'vitest-compat' },
			targets: ['src/a.ts'],
		});
		assert.equal(config.testRunner, 'vitest-compat');
		assert.ok(config.plugins.includes(COMPAT_RUNNER_PLUGIN));
	});

	it('leaves a config with another test runner on that runner', () => {
		const config = buildStrykerConfig({ base: { testRunner: 'jest' }, targets: ['src/a.ts'] });
		assert.equal(config.testRunner, 'jest');
		assert.equal('plugins' in config, false);
	});
});

describe('buildStrykerConfig with a test command', () => {
	const base = { ...SHARED_DEFAULT, testFiles: ['src/old.test.ts'] };

	it('runs the command with the test files added at the end', () => {
		const config = buildStrykerConfig({
			base,
			targets: ['coverage-options.ts:1-40'],
			testFiles: ['coverage-options.test.ts', 'utils/a b.test.ts'],
			testCommand: 'pnpm exec vitest run ',
		});
		assert.equal(config.testRunner, 'command');
		assert.deepEqual(config.commandRunner, {
			command: "pnpm exec vitest run coverage-options.test.ts 'utils/a b.test.ts'",
		});
		assert.deepEqual(config.mutate, ['coverage-options.ts:1-40']);
	});

	// The command runner throws on `testFiles`, and it records no per-test
	// coverage, which `ignoreStatic` needs.
	it('drops the fields that the command runner refuses', () => {
		const config = buildStrykerConfig({ base, targets: ['a.ts'], testCommand: 'pnpm test' });
		assert.equal('testFiles' in config, false);
		assert.equal(config.coverageAnalysis, 'off');
		assert.equal(config.ignoreStatic, false);
		assert.equal(config.commandRunner.command, 'pnpm test');
	});
});

// One run config for each runner, built from the shared default.
const configs = {
	vitest: buildStrykerConfig({ base: SHARED_DEFAULT, targets: ['a.ts'] }),
	command: buildStrykerConfig({
		base: SHARED_DEFAULT,
		targets: ['a.ts'],
		testCommand: 'pnpm test',
	}),
};

describe('buildStrykerConfig for every runner', () => {
	it('never turns on in place mode, so Stryker mutates only its sandbox copy', () => {
		for (const config of Object.values(configs)) {
			assert.deepEqual(Object.keys(config).filter(namesInPlaceMode), []);
		}
	});

	// In the mirror the sandbox has the package's depth, so Stryker must not add
	// `../..` to the tsconfig paths that leave the package.
	it('puts the sandbox in the given temp dir and keeps tsconfig paths as they are', () => {
		const tempDir = '/repo/.stryker-tmp/mirror-1/packages/@n8n';
		const base = { tempDirName: '.stryker-tmp' };
		for (const testCommand of [undefined, 'pnpm test']) {
			const config = buildStrykerConfig({ base, targets: ['a.ts'], testCommand, tempDir });
			assert.equal(config.tempDirName, tempDir);
			assert.equal(config.tsconfigFile, NO_TSCONFIG_REWRITE);
		}
	});

	it('leaves the temp dir and the tsconfig rewrite of the config without a mirror', () => {
		const config = buildStrykerConfig({ base: { tempDirName: '.stryker-tmp' }, targets: ['a.ts'] });
		assert.equal(config.tempDirName, '.stryker-tmp');
		assert.equal('tsconfigFile' in config, false);
	});

	it('removes the sandbox after every run and writes raw.json where mutate.mjs reads it', () => {
		for (const config of Object.values(configs)) {
			assert.equal(config.cleanTempDir, 'always');
			assert.equal(config.jsonReporter.fileName, RAW_REPORT);
			assert.equal(config.reporters.filter((r) => r === 'json').length, 1);
		}
	});
});

describe('buildStrykerConfig defaults', () => {
	it('adds the json reporter to a config that has none', () => {
		const config = buildStrykerConfig({ base: { reporters: ['progress'] }, targets: ['a.ts'] });
		assert.deepEqual(config.reporters, ['progress', 'json']);
		assert.deepEqual(buildStrykerConfig({ targets: ['a.ts'] }).reporters, ['clear-text', 'json']);
	});

	it('keeps the reports and large artefact folders at the package root out of the sandbox', () => {
		assert.deepEqual(buildStrykerConfig({ targets: ['a.ts'] }).ignorePatterns, [
			'/reports/mutation',
			'/coverage',
			'/test-results',
			'/playwright-report',
			'/.playwright-browsers',
			'/ms-playwright-cache',
		]);
	});

	// Stryker loads the compat runner by this path in each test runner process.
	it('names the compat runner plugin by the path of its file', () => {
		assert.equal(path.basename(COMPAT_RUNNER_PLUGIN), 'vitest-compat-runner.mjs');
		assert.ok(statSync(COMPAT_RUNNER_PLUGIN).isFile());
	});

	it('loads only the vitest runner and the compat plugin for a config without plugins', () => {
		assert.deepEqual(buildStrykerConfig({ targets: ['a.ts'] }).plugins, [
			VITEST_PLUGIN,
			COMPAT_RUNNER_PLUGIN,
		]);
	});

	// A tsconfig name that matches no file turns Stryker's rewrite off.
	it('names a tsconfig file that no package has', () => {
		assert.match(NO_TSCONFIG_REWRITE, /^[\w.-]+\.json$/);
		assert.equal(existsSync(path.join(import.meta.dirname, '../..', NO_TSCONFIG_REWRITE)), false);
	});

	it('keeps large artefact folders out of the sandbox copy, on top of the config list', () => {
		const config = buildStrykerConfig({
			base: { ignorePatterns: ['/fixtures/big', '/coverage'] },
			targets: ['a.ts'],
		});
		assert.equal(config.ignorePatterns[0], '/fixtures/big');
		assert.ok(config.ignorePatterns.includes('/playwright-report'));
		assert.equal(config.ignorePatterns.filter((p) => p === '/coverage').length, 1);
	});

	// Incremental results recorded by one runner do not apply to the other.
	it('keeps incremental results in a file for each runner', () => {
		const base = {
			incremental: true,
			incrementalFile: 'reports/mutation/stryker-incremental.json',
		};
		const vitest = buildStrykerConfig({ base, targets: ['a.ts'] });
		const command = buildStrykerConfig({ base, targets: ['a.ts'], testCommand: 'pnpm test' });
		assert.equal(vitest.incrementalFile, 'reports/mutation/stryker-incremental.vitest-compat.json');
		assert.equal(command.incrementalFile, 'reports/mutation/stryker-incremental.command.json');
		const noFile = buildStrykerConfig({ base: { incremental: true }, targets: ['a.ts'] });
		assert.equal(noFile.incrementalFile, 'reports/stryker-incremental.vitest-compat.json');
		assert.equal('incrementalFile' in configs.vitest, false);
	});
});

describe('runnerIncrementalFile', () => {
	it('puts the runner name before the extension', () => {
		assert.equal(runnerIncrementalFile('reports/x.json', 'command'), 'reports/x.command.json');
		assert.equal(runnerIncrementalFile('reports/x', 'command'), 'reports/x.command');
	});
});

describe('sandboxConfigError', () => {
	it('refuses a config that turns on in place mode, and names the file and the option', () => {
		const error = sandboxConfigError({ [IN_PLACE_KEY]: true }, 'packages/pkg/stryker.config.mjs');
		assert.match(error, new RegExp(`packages/pkg/stryker.config.mjs sets "${IN_PLACE_KEY}"`));
		assert.match(error, /working tree/);
	});

	it('says what to do about the option', () => {
		const error = sandboxConfigError({ [IN_PLACE_KEY]: true }, 'a.mjs');
		assert.match(
			error,
			/\nmutate\.mjs runs Stryker only in its sandbox copy of the package\. Remove the option\.$/,
		);
	});

	// Only the option itself switches the mode. A longer key is another option.
	it('ignores keys that only contain the option name', () => {
		const base = { [`${IN_PLACE_KEY}Backup`]: true, [`no${IN_PLACE_KEY}`]: true };
		assert.equal(sandboxConfigError(base, 'a.mjs'), null);
	});

	it('accepts a config that leaves in place mode off', () => {
		assert.equal(sandboxConfigError({ [IN_PLACE_KEY]: false }, 'a.mjs'), null);
		assert.equal(sandboxConfigError(SHARED_DEFAULT, 'a.mjs'), null);
	});
});

describe('toCommandLine', () => {
	it('leaves plain paths as they are', () => {
		assert.equal(
			toCommandLine('pnpm test', ['src/a.test.ts', '@scope/b.test.ts']),
			'pnpm test src/a.test.ts @scope/b.test.ts',
		);
	});

	it('quotes a path that the shell would split or expand', () => {
		assert.equal(toCommandLine('pnpm test', ['a b.ts']), "pnpm test 'a b.ts'");
		assert.equal(toCommandLine('pnpm test', ['src/*.test.ts']), "pnpm test 'src/*.test.ts'");
		assert.equal(toCommandLine('pnpm test', ["it's.ts"]), "pnpm test 'it'\\''s.ts'");
	});

	it('returns the command alone when no test file is named', () => {
		assert.equal(toCommandLine('  pnpm exec vitest run  '), 'pnpm exec vitest run');
	});
});

describe('strykerRunArgv', () => {
	it('starts Stryker on the run config with no other flag', () => {
		const argv = strykerRunArgv('/bin/stryker.js', '/pkg/reports/mutation/stryker.run.json');
		assert.deepEqual(argv, ['/bin/stryker.js', 'run', '/pkg/reports/mutation/stryker.run.json']);
		assert.equal(argv.some(namesInPlaceMode), false);
	});
});

describe('loadBaseConfig and resolveConfig', () => {
	let root;

	beforeEach(() => {
		root = mkdtempSync(path.join(tmpdir(), 'mutate-config-'));
	});

	afterEach(() => {
		rmSync(root, { recursive: true, force: true });
	});

	it('reads a JSON config and the default export of a module config', async () => {
		writeFileSync(path.join(root, 'a.json'), '{ "timeoutMS": 5 }');
		writeFileSync(path.join(root, 'b.mjs'), 'export default { timeoutMS: 6 };');
		assert.deepEqual(await loadBaseConfig(path.join(root, 'a.json')), { timeoutMS: 5 });
		assert.deepEqual(await loadBaseConfig(path.join(root, 'b.mjs')), { timeoutMS: 6 });
	});

	it('stops with a config error for a missing or broken config', async () => {
		writeFileSync(path.join(root, 'broken.mjs'), 'export default {');
		const cases = {
			'missing.mjs': /^Stryker config not found: .*missing\.mjs$/,
			'broken.mjs': /^Could not read the Stryker config .*broken\.mjs: /,
		};
		for (const [file, message] of Object.entries(cases)) {
			await assert.rejects(
				loadBaseConfig(path.join(root, file)),
				(error) => error.exitCode === 2 && message.test(error.message),
			);
		}
	});

	it('writes the run config as JSON next to the reports and returns its path', async () => {
		const file = await writeRunConfig(root, { mutate: ['src/a.ts'], concurrency: 2 });
		assert.equal(file, path.join(root, 'stryker.run.json'));
		const text = readFileSync(file, 'utf8');
		assert.deepEqual(JSON.parse(text), { mutate: ['src/a.ts'], concurrency: 2 });
		assert.ok(text.endsWith('}\n'));
	});

	it('prefers --config, then the package config, then the shared default', () => {
		const pkgRoot = path.join(root, 'pkg');
		mkdirSync(pkgRoot);
		assert.equal(resolveConfig(pkgRoot), path.join(import.meta.dirname, 'stryker.default.mjs'));
		writeFileSync(path.join(pkgRoot, 'stryker.config.mjs'), 'export default {};');
		assert.equal(resolveConfig(pkgRoot), path.join(pkgRoot, 'stryker.config.mjs'));
		assert.equal(resolveConfig(pkgRoot, path.join(root, 'x.mjs')), path.join(root, 'x.mjs'));
	});
});

describe('resolveStrykerBin', () => {
	let root;
	let pkgRoot;

	beforeEach(() => {
		root = mkdtempSync(path.join(tmpdir(), 'mutate-bin-'));
		pkgRoot = path.join(root, 'pkg');
		mkdirSync(pkgRoot);
		writeFileSync(path.join(pkgRoot, 'package.json'), '{ "name": "pkg" }');
	});

	afterEach(() => {
		rmSync(root, { recursive: true, force: true });
	});

	// Put a stand-in copy of Stryker's core package in `dir`, and return where
	// its binary would be.
	function installFakeStryker(dir) {
		const core = path.join(dir, 'node_modules/@stryker-mutator/core');
		mkdirSync(core, { recursive: true });
		writeFileSync(path.join(core, 'package.json'), '{ "name": "@stryker-mutator/core" }');
		return path.join(core, 'bin/stryker.js');
	}

	// The file that the root copy resolves from, in a stand-in repo root.
	const fromRepo = () => path.join(root, 'repo/scripts/mutation-health/stryker.mjs');

	it("uses the package's own copy, so a package gets the version it pins", () => {
		const own = installFakeStryker(pkgRoot);
		installFakeStryker(path.join(root, 'repo'));
		assert.equal(resolveStrykerBin(pkgRoot, 'pkg', { rootFrom: fromRepo() }), own);
	});

	it('falls back to the root copy for a package without its own', () => {
		const rootCopy = installFakeStryker(path.join(root, 'repo'));
		assert.equal(resolveStrykerBin(pkgRoot, 'pkg', { rootFrom: fromRepo() }), rootCopy);
	});

	// A broken checkout must never read as a score of zero.
	it('stops with exit 3 and says what to do when neither has a copy', () => {
		assert.throws(
			() => resolveStrykerBin(pkgRoot, 'packages/pkg', { rootFrom: fromRepo() }),
			(error) =>
				error instanceof MutateError &&
				error.exitCode === 3 &&
				/^Could not resolve @stryker-mutator\/core from packages\/pkg or the repo root\. Run `pnpm install`/.test(
					error.message,
				),
		);
	});

	// CI runs these tests without the root node_modules, so this check needs them.
	const rootStryker = path.join(import.meta.dirname, '../../node_modules/@stryker-mutator/core');
	it(
		"finds this repo's Stryker by default",
		{ skip: !existsSync(rootStryker) && 'the repo root has no node_modules' },
		() => {
			// pnpm links the package, and the lookup gives the real path.
			const expected = path.join(realpathSync(rootStryker), 'bin/stryker.js');
			assert.equal(resolveStrykerBin(pkgRoot, 'pkg'), expected);
		},
	);
});
