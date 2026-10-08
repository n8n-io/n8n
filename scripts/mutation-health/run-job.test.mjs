import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { runJob } from './mutate.mjs';
import { COMPAT_RUNNER_PLUGIN, NO_TSCONFIG_REWRITE } from './stryker.mjs';
import { MutateError, repoRoot } from './targets.mjs';
import {
	FAKE_STRYKER_BIN,
	IN_PLACE_KEY,
	fakeProcess,
	fakeSpawn,
	namesInPlaceMode,
	resolveFakeStrykerBin,
	sink,
} from './test-doubles.mjs';

// A Stryker report with one killed and one surviving mutant.
const RAW_REPORT = {
	files: {
		'src/a.ts': {
			source: 'export const a = 1 + 2;\n',
			mutants: [
				{
					id: '1',
					mutatorName: 'ArithmeticOperator',
					status: 'Killed',
					location: { start: { line: 1, column: 17 }, end: { line: 1, column: 22 } },
					replacement: '1 - 2',
				},
				{
					id: '2',
					mutatorName: 'NumericLiteral',
					status: 'Survived',
					location: { start: { line: 1, column: 21 }, end: { line: 1, column: 22 } },
					replacement: '3',
				},
			],
		},
	},
};

// A temp repo with the package under test and a sibling package that a config
// can reach with `..`. It is outside this repo, so a run gets a sandbox mirror
// only when a test passes the temp repo as `repoRoot`.
let root;
let pkgRoot;
const SIBLING = 'packages/@n8n/sib/x.ts';

beforeEach(() => {
	root = mkdtempSync(path.join(tmpdir(), 'mutate-job-'));
	pkgRoot = path.join(root, 'packages/@n8n/pkg');
	mkdirSync(path.join(pkgRoot, 'src'), { recursive: true });
	writeFileSync(
		path.join(pkgRoot, 'package.json'),
		'{ "name": "pkg", "scripts": { "test": "vitest run" } }',
	);
	writeFileSync(path.join(pkgRoot, 'src/a.ts'), RAW_REPORT.files['src/a.ts'].source);
	mkdirSync(path.dirname(path.join(root, SIBLING)), { recursive: true });
	writeFileSync(path.join(root, SIBLING), 'sibling\n');
});

afterEach(() => {
	rmSync(root, { recursive: true, force: true });
});

const reportFile = (name) => path.join(pkgRoot, 'reports/mutation', name);

// Run one job with a fake Stryker. `stryker` gets the fake child, the spawn
// call and the stand-in process, and decides what the run writes, prints and
// returns.
// `inRepo` makes the temp repo the repo that the sandbox mirror copies.
function runFakeJob({ args = {}, stryker, inRepo = false, jobFields = {} } = {}) {
	const p = fakeProcess();
	const stderr = sink();
	const doubles = fakeSpawn({
		onSpawn: (child, call) => setImmediate(() => stryker(child, call, p)),
	});
	const job = {
		pkgRoot,
		packageDir: path.relative(repoRoot, pkgRoot),
		targets: ['src/a.ts'],
		...jobFields,
	};
	const fullArgs = { configArg: undefined, testFiles: [], testCommand: undefined, ...args };
	const io = {
		resolveStrykerBin: resolveFakeStrykerBin,
		...(inRepo ? { repoRoot: root } : {}),
		spawn: doubles.spawn,
		stdout: sink(),
		stderr,
		proc: p.proc,
		exit: p.exit,
		write: p.write,
	};
	const promise = runJob(job, fullArgs, io);
	return { ...doubles, ...p, stderr, promise };
}

function writesReport(child) {
	writeFileSync(reportFile('raw.json'), JSON.stringify(RAW_REPORT));
	child.finish(0);
}

const runConfig = () => JSON.parse(readFileSync(reportFile('stryker.run.json'), 'utf8'));

describe('runJob with the default runner', () => {
	it('starts only Stryker, on the run config, in the package dir, with no in place flag', async () => {
		const run = runFakeJob({ args: { testFiles: ['src/a.test.ts'] }, stryker: writesReport });
		await run.promise;
		assert.equal(run.calls.length, 1);
		const [{ command, args, options }] = run.calls;
		assert.equal(command, process.execPath);
		assert.deepEqual(args, [FAKE_STRYKER_BIN, 'run', reportFile('stryker.run.json')]);
		assert.equal(args.some(namesInPlaceMode), false);
		assert.equal(options.cwd, pkgRoot);
	});

	it('gives Stryker a sandbox config with the vitest-compat runner and the test files', async () => {
		const run = runFakeJob({ args: { testFiles: ['src/a.test.ts'] }, stryker: writesReport });
		await run.promise;
		const config = runConfig();
		assert.equal(config.testRunner, 'vitest-compat');
		assert.ok(config.plugins.includes(COMPAT_RUNNER_PLUGIN));
		assert.deepEqual(config.mutate, ['src/a.ts']);
		assert.deepEqual(config.testFiles, ['src/a.test.ts']);
		assert.deepEqual(Object.keys(config).filter(namesInPlaceMode), []);
		// A package outside the repo gets no mirror, so the config's temp dir stays.
		assert.equal(config.tempDirName, '.stryker-tmp');
		assert.match(
			run.stderr.text(),
			/Running Stryker on .* \(config: .*stryker\.default\.mjs, runner: vitest-compat/,
		);
		assert.match(run.stderr.text(), /^ {2}testFiles: src\/a\.test\.ts$/m);
	});

	// --diff gives a packages/cli job the cli tests that the patch changed.
	it('runs the test files that the plan gave the job when --test-files is absent', async () => {
		const jobFields = { testFiles: ['src/a.test.ts', 'src/b.test.ts'] };
		const run = runFakeJob({ jobFields, stryker: writesReport });
		await run.promise;
		assert.deepEqual(runConfig().testFiles, ['src/a.test.ts', 'src/b.test.ts']);
		assert.match(run.stderr.text(), /^ {2}testFiles: src\/a\.test\.ts, src\/b\.test\.ts$/m);
	});

	it('runs the --test-files instead of the test files of the plan', async () => {
		const jobFields = { testFiles: ['src/a.test.ts'] };
		const args = { testFiles: ['src/c.test.ts'] };
		await runFakeJob({ args, jobFields, stryker: writesReport }).promise;
		assert.deepEqual(runConfig().testFiles, ['src/c.test.ts']);
	});

	it("writes the summary from this run's report and keeps the gate", async () => {
		const run = runFakeJob({ stryker: writesReport });
		const result = await run.promise;
		assert.equal(result.packageDir, path.relative(repoRoot, pkgRoot));
		assert.match(result.summaryPath, /packages\/@n8n\/pkg\/reports\/mutation\/summary\.json$/);
		assert.equal(result.noTests, false);
		assert.equal(result.summary.overall.score, 50);
		assert.equal(result.summary.overall.thresholdMet, false);
		assert.equal(result.summary.testRunner, 'vitest-compat');
		assert.deepEqual(JSON.parse(readFileSync(reportFile('summary.json'), 'utf8')), result.summary);
	});

	// A report left by an earlier run must never stand in for this one.
	it('fails a run that wrote no report, even when an earlier report was on disk', async () => {
		mkdirSync(path.dirname(reportFile('raw.json')), { recursive: true });
		writeFileSync(reportFile('raw.json'), JSON.stringify(RAW_REPORT));
		writeFileSync(reportFile('summary.json'), '{}');
		const run = runFakeJob({ stryker: (child) => child.finish(1) });
		const result = await run.promise;
		assert.equal(result.failed, true);
		assert.equal(existsSync(reportFile('summary.json')), false);
		assert.match(
			run.stderr.text(),
			/: Stryker exited 1 without producing .*packages\/@n8n\/pkg\/reports\/mutation\/raw\.json\n/,
		);
	});

	it('records a score-0 red result when no test covers the target', async () => {
		const run = runFakeJob({
			stryker: (child) => {
				child.stdout.emit('data', 'Instrumented 1 source file(s) with 7 mutant(s)\n');
				child.stdout.emit('data', 'ERROR No tests were executed.\n');
				child.finish(1);
			},
		});
		const result = await run.promise;
		assert.equal(result.noTests, true);
		assert.equal(result.summary.overall.counts.noCoverage, 7);
	});
});

describe('runJob with a test command', () => {
	it('gives Stryker the command runner with the test files on the command', async () => {
		const run = runFakeJob({
			args: { testFiles: ['src/a.test.ts'], testCommand: 'pnpm exec vitest run' },
			stryker: writesReport,
		});
		const result = await run.promise;
		const config = runConfig();
		assert.equal(config.testRunner, 'command');
		assert.equal(config.commandRunner.command, 'pnpm exec vitest run src/a.test.ts');
		assert.equal('testFiles' in config, false);
		assert.equal(result.summary.testRunner, 'command');
		assert.match(run.stderr.text(), /^ {2}command: pnpm exec vitest run src\/a\.test\.ts$/m);
	});
});

describe('runJob guards and cancellation', () => {
	it('refuses a config that turns on in place mode before Stryker starts', async () => {
		const configArg = path.join(root, 'working-tree-mode.json');
		writeFileSync(configArg, JSON.stringify({ [IN_PLACE_KEY]: true }));
		const run = runFakeJob({ args: { configArg }, stryker: writesReport });
		await assert.rejects(
			run.promise,
			(error) => error instanceof MutateError && error.exitCode === 2,
		);
		assert.equal(run.calls.length, 0);
	});

	it('exits with the signal code when the run is cancelled', async () => {
		const run = runFakeJob({ stryker: cancels });
		await assert.rejects(
			run.promise,
			(error) => error.exitCode === 130 && error.message === '\nRun cancelled by SIGINT.',
		);
		assert.deepEqual(run.children[0].kills, ['SIGINT']);
	});

	it('stops with exit 3 before it writes anything when Stryker is not installed', async () => {
		const job = { pkgRoot, packageDir: 'packages/@n8n/pkg', targets: ['src/a.ts'] };
		const resolveStrykerBin = () => {
			throw new MutateError(3, 'Could not resolve @stryker-mutator/core');
		};
		const doubles = fakeSpawn();
		await assert.rejects(
			runJob(job, { testFiles: [] }, { resolveStrykerBin, repoRoot: root, spawn: doubles.spawn }),
			(error) => error.exitCode === 3,
		);
		assert.equal(doubles.calls.length, 0);
		assert.equal(existsSync(path.join(pkgRoot, 'reports')), false);
		assert.equal(existsSync(path.join(root, '.stryker-tmp')), false);
	});
});

// A user cancels the run while Stryker runs.
function cancels(child, _call, p) {
	p.proc.emit('SIGINT');
	child.finish(130);
}

describe('runJob in a repo, with the sandbox in a mirror', () => {
	const mirrorParent = () => path.join(root, '.stryker-tmp');

	// A fake Stryker that does what Stryker does with its config: it makes a
	// sandbox in the temp dir. It records what a test in the sandbox would see.
	function inspectsSandbox(seen, then = writesReport) {
		return (child, call, p) => {
			const config = JSON.parse(readFileSync(call.args[2], 'utf8'));
			const sandbox = path.join(config.tempDirName, 'sandbox-1');
			mkdirSync(sandbox);
			Object.assign(seen, {
				config,
				// The OS resolves `..` from the sandbox, as the test runner does.
				sibling: readFileSync(`${sandbox}/../sib/x.ts`, 'utf8'),
				mirrorExists: existsSync(mirrorParent()),
			});
			then(child, call, p);
		};
	}

	it('gives Stryker a temp dir in a mirror at the depth of the package', async () => {
		const seen = {};
		await runFakeJob({ inRepo: true, stryker: inspectsSandbox(seen) }).promise;
		assert.match(
			path.relative(mirrorParent(), seen.config.tempDirName),
			/^mirror-[^/]+\/packages\/@n8n$/,
		);
		// The paths in the package's tsconfig are already right in the mirror.
		assert.equal(seen.config.tsconfigFile, NO_TSCONFIG_REWRITE);
	});

	// The cli alias `../@n8n/telemetry/src` is one such path.
	it('lets a path that leaves the sandbox with `..` reach the real sibling package', async () => {
		const seen = {};
		await runFakeJob({ inRepo: true, stryker: inspectsSandbox(seen) }).promise;
		assert.equal(seen.sibling, 'sibling\n');
	});

	const exitPaths = {
		'a run that wrote a report': { finish: writesReport, outcome: 'resolved' },
		'a run that wrote no report': { finish: (child) => child.finish(1), outcome: 'resolved' },
		'a Stryker that did not start': {
			finish: (child) => child.emit('error', new Error('spawn ENOENT')),
			outcome: 3,
		},
		'a cancelled run': { finish: cancels, outcome: 130 },
	};

	for (const [name, { finish, outcome }] of Object.entries(exitPaths)) {
		it(`removes the mirror after ${name} and keeps every real file`, async () => {
			const seen = {};
			const run = runFakeJob({ inRepo: true, stryker: inspectsSandbox(seen, finish) });
			const result = await run.promise.then(
				() => 'resolved',
				(error) => error.exitCode,
			);
			assert.equal(result, outcome);
			assert.equal(seen.mirrorExists, true);
			assert.equal(existsSync(mirrorParent()), false);
			assert.equal(readFileSync(path.join(root, SIBLING), 'utf8'), 'sibling\n');
			assert.ok(existsSync(path.join(pkgRoot, 'src/a.ts')));
		});
	}
});
