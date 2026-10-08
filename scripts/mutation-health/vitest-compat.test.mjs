import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
	COMPAT_RUNNER_NAME,
	compatPlugins,
	fileLoadErrors,
	toNestedNamePattern,
	withLoadErrors,
	withNestedNamePatterns,
} from './vitest-compat.mjs';

// The pattern @stryker-mutator/vitest-runner 10.0.0 builds for a mutant: each
// covering test's name (suite and test joined by a space), escaped, joined by
// `|`. `escapeRegExp` is a copy of the runner's helper in @stryker-mutator/util.
function escapeRegExp(input) {
	return input.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&');
}
function runnerPattern(...names) {
	return new RegExp(names.map(escapeRegExp).join('|'));
}

describe('toNestedNamePattern', () => {
	const name = 'modelConfigId returns plain-string model ids as-is';

	// This is the Vitest 5 failure: the plain pattern misses the nested name.
	it('selects a nested test by its Vitest 5 full name', () => {
		const vitest5Name = 'modelConfigId > returns plain-string model ids as-is';
		assert.equal(runnerPattern(name).test(vitest5Name), false);
		assert.equal(toNestedNamePattern(runnerPattern(name)).test(vitest5Name), true);
	});

	it('still selects the test by its Vitest 4 name', () => {
		assert.equal(toNestedNamePattern(runnerPattern(name)).test(name), true);
	});

	it('selects tests nested at any depth', () => {
		const pattern = toNestedNamePattern(
			runnerPattern('scheduler lifecycle config rejects a jitter'),
		);
		assert.equal(pattern.test('scheduler > lifecycle > config > rejects a jitter'), true);
	});

	it('selects every covering test and no other test', () => {
		const pattern = toNestedNamePattern(runnerPattern('a reads x', 'b writes y'));
		assert.equal(pattern.test('a > reads x'), true);
		assert.equal(pattern.test('b > writes y'), true);
		assert.equal(pattern.test('a > writes y'), false);
		assert.equal(pattern.test('c > reads z'), false);
	});

	it('keeps regex characters in a test name literal', () => {
		const pattern = toNestedNamePattern(runnerPattern('parser reads (a|b) as text.'));
		assert.equal(pattern.test('parser > reads (a|b) as text.'), true);
		assert.equal(pattern.test('parser > reads a as text.'), false);
		assert.equal(pattern.test('parser > reads (a|b) as textX'), false);
	});

	it('keeps the flags of the pattern', () => {
		assert.equal(toNestedNamePattern(/a b/i).flags, 'i');
		assert.equal(toNestedNamePattern(/a b/i).test('A > B'), true);
	});

	// Vitest can start twice on the same pattern. A second conversion would
	// break the alternations of the first.
	it('returns a pattern it made unchanged', () => {
		const nested = toNestedNamePattern(runnerPattern(name));
		assert.equal(toNestedNamePattern(nested), nested);
	});

	it('leaves a missing pattern missing: the run then selects every test', () => {
		assert.equal(toNestedNamePattern(undefined), undefined);
	});
});

describe('withNestedNamePatterns', () => {
	// A stand-in for the vitest runner: `init` makes a Vitest context with two
	// projects, and `start` records the patterns it runs with.
	function fakeRunner() {
		const started = [];
		const runner = {
			async init() {
				const projects = [{ config: {} }, { config: {} }];
				this.ctx = {
					projects,
					start: async (files) => {
						started.push({ files, patterns: projects.map((p) => p.config.testNamePattern) });
					},
				};
			},
		};
		return { runner, started };
	}

	// What the runner does for a mutant: set the pattern on each project, then start.
	function runMutant(runner, pattern, files) {
		for (const project of runner.ctx.projects) project.config.testNamePattern = pattern;
		return runner.ctx.start(files);
	}

	it('runs Vitest with patterns that select nested tests', async () => {
		const { runner, started } = fakeRunner();
		assert.equal(withNestedNamePatterns(runner), runner);
		await runner.init();
		await runMutant(runner, runnerPattern('suite reads x'), ['src/a.test.ts']);
		assert.deepEqual(started[0].files, ['src/a.test.ts']);
		for (const pattern of started[0].patterns) assert.equal(pattern.test('suite > reads x'), true);
	});

	it('runs Vitest without a pattern when the runner sets none', async () => {
		const { runner, started } = fakeRunner();
		withNestedNamePatterns(runner);
		await runner.init();
		await runMutant(runner, undefined, undefined);
		assert.deepEqual(started[0].patterns, [undefined, undefined]);
	});

	// Stryker can init a runner again after it disposes it.
	it('wraps the new Vitest context of each init', async () => {
		const { runner, started } = fakeRunner();
		withNestedNamePatterns(runner);
		await runner.init();
		await runner.init();
		await runMutant(runner, runnerPattern('suite reads x'), []);
		assert.equal(started[0].patterns[0].test('suite > reads x'), true);
	});
});

// Vitest's record of a test file: `tasks` holds what it collected.
function testFile(filepath, state, { errors = [], tasks = 0 } = {}) {
	return {
		filepath,
		tasks: Array.from({ length: tasks }, () => ({})),
		result: { state, errors: errors.map((message) => ({ message })) },
	};
}

describe('fileLoadErrors', () => {
	it('names each file that failed before it collected a test, with its errors', () => {
		const files = [
			testFile('/pkg/a.test.ts', 'pass', { tasks: 3 }),
			testFile('/pkg/b.test.ts', 'fail', { errors: ["Cannot find package '@n8n/telemetry'"] }),
			testFile('/pkg/c.test.ts', 'fail', { errors: ['first', 'second'] }),
		];
		assert.deepEqual(fileLoadErrors(files), [
			"/pkg/b.test.ts: Cannot find package '@n8n/telemetry'",
			'/pkg/c.test.ts: first; second',
		]);
	});

	// The runner reports failed tests itself.
	it('leaves out a file that passed, or that has no result yet', () => {
		const files = [testFile('/pkg/a.test.ts', 'pass'), { filepath: '/pkg/b.test.ts', tasks: [] }];
		assert.deepEqual(fileLoadErrors(files), []);
	});

	it('leaves out a file whose tests ran and failed', () => {
		assert.deepEqual(fileLoadErrors([testFile('/pkg/a.test.ts', 'fail', { tasks: 2 })]), []);
	});

	it('still names a failed file that recorded no error message', () => {
		const noErrorList = { filepath: '/pkg/b.test.ts', tasks: [], result: { state: 'fail' } };
		assert.deepEqual(fileLoadErrors([testFile('/pkg/a.test.ts', 'fail'), noErrorList]), [
			'/pkg/a.test.ts: the file did not load',
			'/pkg/b.test.ts: the file did not load',
		]);
	});
});

describe('withLoadErrors', () => {
	function fakeRunner(result, files) {
		return {
			ctx: { state: { getFiles: () => files } },
			dryRun: async () => result,
		};
	}

	it('fails the dry run, with the error, when a test file did not load', async () => {
		const files = [testFile('/pkg/a.test.ts', 'fail', { errors: ['Cannot find package'] })];
		const runner = withLoadErrors(fakeRunner({ status: 'complete', tests: [] }, files));
		assert.deepEqual(await runner.dryRun({}), {
			status: 'error',
			errorMessage: 'A test file did not load:\n/pkg/a.test.ts: Cannot find package',
		});
	});

	it('puts each file that did not load on its own line', async () => {
		const files = [
			testFile('/pkg/a.test.ts', 'fail', { errors: ['first'] }),
			testFile('/pkg/b.test.ts', 'fail', { errors: ['second'] }),
		];
		const runner = withLoadErrors(fakeRunner({ status: 'complete', tests: [] }, files));
		assert.equal(
			(await runner.dryRun({})).errorMessage,
			'A test file did not load:\n/pkg/a.test.ts: first\n/pkg/b.test.ts: second',
		);
	});

	it('keeps a dry run where every file loaded', async () => {
		const result = { status: 'complete', tests: [{ id: 't1' }] };
		const runner = withLoadErrors(
			fakeRunner(result, [testFile('/pkg/a.test.ts', 'pass', { tasks: 1 })]),
		);
		assert.equal(await runner.dryRun({}), result);
	});

	it('keeps a dry run that already failed for another reason', async () => {
		const result = { status: 'timeout' };
		const runner = withLoadErrors(fakeRunner(result, [testFile('/pkg/a.test.ts', 'fail')]));
		assert.equal(await runner.dryRun({}), result);
	});
});

describe('compatPlugins', () => {
	// A stand-in for the plugin list of @stryker-mutator/vitest-runner. Its
	// runner makes a Vitest context with one project and a set of test files.
	function runnerPlugins(files = []) {
		function factory(injector) {
			return {
				injector,
				async init() {
					const projects = [{ config: {} }];
					this.ctx = {
						projects,
						state: { getFiles: () => files },
						start: async () => projects.map((project) => project.config.testNamePattern),
					};
				},
				async dryRun() {
					return { status: 'complete', tests: [] };
				},
			};
		}
		factory.inject = ['$injector'];
		return [
			{ kind: 'Reporter', name: 'vitest', factory: () => ({}) },
			{ kind: 'TestRunner', name: 'vitest', factory },
		];
	}

	it('declares one vitest-compat test runner with the dependencies of the vitest runner', () => {
		const plugins = compatPlugins(runnerPlugins());
		assert.equal(plugins.length, 1);
		const [plugin] = plugins;
		assert.equal(plugin.kind, 'TestRunner');
		// The name shows in stryker.run.json and in the README.
		assert.equal(plugin.name, 'vitest-compat');
		assert.equal(plugin.name, COMPAT_RUNNER_NAME);
		assert.deepEqual(plugin.factory.inject, ['$injector']);
	});

	it('makes a vitest runner, from the same injector, that selects nested tests', async () => {
		const [plugin] = compatPlugins(runnerPlugins());
		const injector = {};
		const runner = plugin.factory(injector);
		assert.equal(runner.injector, injector);
		await runner.init();
		runner.ctx.projects[0].config.testNamePattern = runnerPattern('suite reads x');
		const [pattern] = await runner.ctx.start([]);
		assert.equal(pattern.test('suite > reads x'), true);
	});

	it('makes a vitest runner whose dry run fails when a test file did not load', async () => {
		const files = [testFile('/pkg/a.test.ts', 'fail', { errors: ['Cannot find package'] })];
		const runner = compatPlugins(runnerPlugins(files))[0].factory({});
		await runner.init();
		assert.deepEqual(await runner.dryRun({}), {
			status: 'error',
			errorMessage: 'A test file did not load:\n/pkg/a.test.ts: Cannot find package',
		});
	});

	// A runner upgrade that renames the export must stop the run with a clear message.
	it('throws when the list has no vitest test runner', () => {
		const [reporter, testRunner] = runnerPlugins();
		const renamed = { ...testRunner, name: 'vitest-next' };
		for (const plugins of [[reporter], [renamed], []]) {
			assert.throws(
				() => compatPlugins(plugins),
				/^Error: @stryker-mutator\/vitest-runner no longer declares the "vitest" test runner\.$/,
			);
		}
	});
});

// CI runs these tests without the root node_modules, so these checks need them.
function unlessRunnerMissing(error) {
	if (
		error.code === 'ERR_MODULE_NOT_FOUND' &&
		/'@stryker-mutator\/vitest-runner'/.test(error.message)
	) {
		return null;
	}
	throw error;
}
const installedPlugins = await import('./vitest-compat-runner.mjs').then(
	(module) => module.strykerPlugins,
	unlessRunnerMissing,
);
const installedRunnerPlugins = await import('@stryker-mutator/vitest-runner').then(
	(module) => module.strykerPlugins,
	unlessRunnerMissing,
);

// The injector that Stryker gives the runner's factory, with the runner options.
function injectorFor(options) {
	return {
		provideValue() {
			return this;
		},
		injectClass(RunnerClass) {
			return new RunnerClass(options, {}, '__stryker__');
		},
	};
}

// A stand-in for the Vitest context that the runner's `init` makes. `start`
// records the files and the test name pattern of each test run. `files` is
// what Vitest recorded for the test files.
function fakeVitest(started, files = []) {
	const projects = [{ config: {} }];
	return {
		projects,
		config: {},
		provide() {},
		state: { filesMap: new Map(), getFiles: () => files, errorsSet: new Set() },
		async start(files) {
			started.push({ files, pattern: projects[0].config.testNamePattern });
		},
	};
}

describe('the vitest-compat plugin file', () => {
	const skip = !installedPlugins && '@stryker-mutator/vitest-runner is not installed';

	it(
		'declares the vitest-compat runner with the dependencies of the installed runner',
		{ skip },
		() => {
			const vitestRunner = installedRunnerPlugins.find(
				(plugin) => plugin.kind === 'TestRunner' && plugin.name === 'vitest',
			);
			assert.equal(installedPlugins.length, 1);
			const [plugin] = installedPlugins;
			assert.equal(plugin.kind, 'TestRunner');
			assert.equal(plugin.name, COMPAT_RUNNER_NAME);
			assert.deepEqual(plugin.factory.inject, vitestRunner.factory.inject);
		},
	);

	// The installed runner's own dry run, on a Vitest stand-in. The stand-in is
	// set in place of `init`, which would start the real Vitest.
	it(
		'makes the dry run of the installed runner fail when a test file did not load',
		{ skip },
		async () => {
			// The runner reads the coverage of each file from `meta`.
			const failed = {
				...testFile('/pkg/a.test.ts', 'fail', { errors: ['Cannot find package'] }),
				meta: {},
			};
			const runner = installedPlugins[0].factory(injectorFor({ vitest: { related: false } }));
			const started = [];
			runner.ctx = fakeVitest(started, [failed]);
			const result = await runner.dryRun({ files: ['/pkg/src/a.ts'] });
			assert.equal(started.length, 1);
			assert.deepEqual(result, {
				status: 'error',
				errorMessage: 'A test file did not load:\n/pkg/a.test.ts: Cannot find package',
			});
		},
	);

	// The runner's own mutant run, with Vitest replaced by a stand-in. A runner
	// upgrade that selects tests in another way fails here, and not as a run
	// that kills no mutant.
	it('makes the installed runner select a nested test for a mutant', { skip }, async () => {
		const vitestRunner = installedRunnerPlugins.find(
			(plugin) => plugin.kind === 'TestRunner' && plugin.name === 'vitest',
		);
		const started = [];
		function withFakeVitest(injector) {
			const runner = vitestRunner.factory(injector);
			// Only the start of Vitest is replaced. The fixes wrap this `init`.
			runner.init = async () => {
				runner.ctx = fakeVitest(started);
			};
			return runner;
		}
		withFakeVitest.inject = vitestRunner.factory.inject;
		const [plugin] = compatPlugins([
			{ kind: vitestRunner.kind, name: 'vitest', factory: withFakeVitest },
		]);
		const runner = plugin.factory(injectorFor({ vitest: { related: true } }));
		await runner.init();
		await runner.mutantRun({
			activeMutant: { id: '1' },
			testFilter: ['/pkg/a.test.ts#suite reads x'],
			sandboxFileName: '/pkg/src/a.ts',
			mutantActivation: 'runtime',
		});
		assert.equal(started.length, 1);
		const [{ files, pattern }] = started;
		assert.deepEqual(files, ['/pkg/a.test.ts']);
		assert.equal(pattern.test('suite > reads x'), true);
		assert.equal(pattern.test('suite reads x'), true);
		assert.equal(pattern.test('suite > reads y'), false);
	});
});
