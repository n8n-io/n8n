import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { USAGE, main, reportResults } from './mutate.mjs';
import { buildSummary } from './summary.mjs';
import { MutateError } from './targets.mjs';
import {
	SAMPLE_REPO,
	fakeProcess,
	fakeSpawn,
	resolveFakeStrykerBin,
	sink,
	writeTree,
} from './test-doubles.mjs';

const SOURCE = 'export const a = 1 + 2;\n';

// A Stryker report with one mutant for each given status. `extra` goes on each mutant.
function report(statuses, extra = {}) {
	return {
		files: {
			'src/a.ts': {
				source: SOURCE,
				mutants: statuses.map((status, index) => ({
					id: String(index),
					mutatorName: 'ArithmeticOperator',
					status,
					location: { start: { line: 1, column: 17 }, end: { line: 1, column: 22 } },
					replacement: '1 - 2',
					...extra,
				})),
			},
		},
	};
}

// `pkgRoot` sits in a temp dir. A test that plans from the repo root seeds
// SAMPLE_REPO in that dir and passes it as `repoRoot`.
let pkgRoot;
const tempRepo = () => path.dirname(pkgRoot);

beforeEach(() => {
	pkgRoot = path.join(mkdtempSync(path.join(tmpdir(), 'mutate-main-')), 'pkg');
	mkdirSync(path.join(pkgRoot, 'src'), { recursive: true });
	writeFileSync(
		path.join(pkgRoot, 'package.json'),
		'{ "name": "pkg", "scripts": { "test": "vitest run" } }',
	);
	writeFileSync(path.join(pkgRoot, 'src/a.ts'), SOURCE);
});

afterEach(() => {
	rmSync(path.dirname(pkgRoot), { recursive: true, force: true });
});

// Start the whole command on the temp package with a fake Stryker that writes
// `raw` as its report (no report when `raw` is null) and exits with `exitCode`.
function startMain({
	raw,
	exitCode = 0,
	argv = ['src/a.ts', '--package-dir', pkgRoot],
	git,
	repoRoot,
} = {}) {
	const doubles = fakeSpawn({
		onSpawn: (child, { options }) =>
			setImmediate(() => {
				if (raw) {
					writeFileSync(path.join(options.cwd, 'reports/mutation/raw.json'), JSON.stringify(raw));
				}
				child.finish(exitCode);
			}),
	});
	const p = fakeProcess();
	const stderr = sink();
	const stdout = sink();
	const io = {
		git,
		repoRoot,
		resolveStrykerBin: resolveFakeStrykerBin,
		spawn: doubles.spawn,
		stdout,
		stderr,
		proc: p.proc,
		exit: p.exit,
		write: p.write,
	};
	return { promise: main(argv, io), stderr, stdout, calls: doubles.calls };
}

// Run the whole command to its exit code (see startMain).
async function runMain(options) {
	const run = startMain(options);
	const code = await run.promise;
	return { code, stderr: run.stderr.text(), stdout: run.stdout.text(), calls: run.calls };
}

describe('main', () => {
	it('exits 0 and prints PASS when every mutant is killed or justified', async () => {
		const run = await runMain({ raw: report(['Killed', 'Killed', 'Ignored']) });
		assert.equal(run.code, 0);
		assert.match(run.stderr, /\n=== Mutation summary ===\n/);
		assert.match(run.stderr, /\n {2}summary: .*pkg\/reports\/mutation\/summary\.json\n/);
		assert.match(
			run.stderr,
			/\nGate: PASS {2}• {2}threshold: \d+(\.\d+)?% {2}• {2}unjustified survivors: 0 {2}• {2}ignored \(justified\): 1\n$/,
		);
	});

	it('exits 1 and prints FAIL when a mutant survives', async () => {
		const run = await runMain({
			raw: report(['Killed', 'Killed', 'Killed', 'Killed', 'Survived']),
		});
		assert.equal(run.code, 1);
		assert.match(run.stderr, /\nGate: FAIL {2}• .*unjustified survivors: 1 /);
	});

	// The mutants a partial run never tested can be survivors.
	it('exits 1 and says so when Stryker wrote a report and then failed', async () => {
		const run = await runMain({ raw: report(['Killed']), exitCode: 1 });
		assert.equal(run.code, 1);
		assert.match(run.stderr, /\nGate: FAIL \(partial\) {2}• /);
	});

	// A broken toolchain must never read as a score of zero.
	it('exits 3 when Stryker wrote no report', async () => {
		const run = await runMain({ raw: null, exitCode: 1 });
		assert.equal(run.code, 3);
		assert.match(
			run.stderr,
			/\nGate: ERROR — at least one Stryker run produced no valid report\.\n$/,
		);
	});

	// The plain vitest runner under Vitest 5 ran no test for any mutant, and
	// every mutant survived. That must read as a broken toolchain, not a score.
	it('exits 3 and writes no summary when covered mutants survived with no test run', async () => {
		const notRun = { coveredBy: ['t1'], testsCompleted: 0 };
		const run = await runMain({ raw: report(['Survived', 'Survived'], notRun) });
		assert.equal(run.code, 3);
		assert.match(
			run.stderr,
			/\n✗ .*pkg: 2 mutant\(s\) survived with no test run, but tests cover them:\n {3}- src\/a\.ts:1:17\n/,
		);
		assert.match(
			run.stderr,
			/\nGate: ERROR — at least one Stryker run produced no valid report\.\n$/,
		);
		assert.equal(existsSync(path.join(pkgRoot, 'reports/mutation/summary.json')), false);
	});

	// The playwright package has only a `test:unit` script.
	it('scores a package without a vitest test script through its test command', async () => {
		writeFileSync(path.join(pkgRoot, 'package.json'), '{ "name": "pkg", "scripts": {} }');
		const run = await runMain({
			raw: report(['Killed']),
			argv: ['src/a.ts', '--package-dir', pkgRoot, '--test-command', 'pnpm exec vitest run'],
		});
		assert.equal(run.code, 0);
		assert.match(run.stderr, /runner: command, /);
		assert.equal(run.calls.length, 1);
	});

	it('prints the usage on --help and starts nothing', async () => {
		const run = await runMain({ argv: ['--help'] });
		assert.equal(run.code, 0);
		assert.equal(run.stdout, `${USAGE}\n`);
		assert.deepEqual(run.calls, []);
	});

	it('throws a usage error with the usage text for a bad command line', async () => {
		await assert.rejects(
			runMain({ argv: [] }),
			(error) =>
				error instanceof MutateError &&
				error.exitCode === 2 &&
				error.showUsage &&
				error.message === 'Missing mutate target.',
		);
	});

	it('refuses a cli target without test files before Stryker starts', async () => {
		writeTree(tempRepo(), SAMPLE_REPO);
		const target = 'packages/cli/src/credentials/external-secrets.utils.ts';
		await assert.rejects(
			runMain({ argv: [target], repoRoot: tempRepo() }),
			(error) =>
				error.exitCode === 2 && /^Mutating packages\/cli needs --test-files\./.test(error.message),
		);
	});
});

describe('main --diff', () => {
	// A git stand-in for a branch that added lines 2-4 to each file in `names`.
	const gitChanged = (names) => (args) => {
		if (args[0] === 'merge-base') return { status: 0, stdout: 'abc123\n', stderr: '' };
		if (args.includes('-U0')) return { status: 0, stdout: '@@ -1,0 +2,3 @@\n+x\n', stderr: '' };
		return { status: 0, stdout: `${names.join('\n')}\n`, stderr: '' };
	};

	it('exits 0 and says so when the branch changed no mutable source', async () => {
		const run = await runMain({ argv: ['--diff'], git: gitChanged(['README.md']) });
		assert.equal(run.code, 0);
		assert.equal(run.stderr, '\nNothing mutable changed vs origin/master.\n');
		assert.deepEqual(run.calls, []);
	});

	it('names each changed file that it skips, and starts no run', async () => {
		writeTree(tempRepo(), SAMPLE_REPO);
		const blocked = 'packages/@n8n/expression-runtime/src/index.ts';
		const run = await runMain({
			argv: ['--diff', '--base', 'upstream/master'],
			git: gitChanged([blocked]),
			repoRoot: tempRepo(),
		});
		assert.equal(run.code, 0);
		assert.match(run.stderr, /^ {2}skipped packages\/@n8n\/expression-runtime\/src\/index\.ts — /);
		assert.match(run.stderr, /\nNothing mutable changed vs upstream\/master\.\n$/);
		assert.deepEqual(run.calls, []);
	});

	// --test-files does not work with --diff, so the message must not ask for it.
	// Every scope check runs before the first run: the instance-ai job, planned
	// first, must not start either.
	it('refuses a changed cli source without a changed cli test before any run starts', async () => {
		writeTree(tempRepo(), SAMPLE_REPO);
		const sources = [
			'packages/@n8n/instance-ai/src/utils/model-config-id.ts',
			'packages/cli/src/credentials/external-secrets.utils.ts',
		];
		const run = startMain({
			raw: report(['Killed']),
			argv: ['--diff'],
			git: gitChanged(sources),
			repoRoot: tempRepo(),
		});
		await assert.rejects(
			run.promise,
			(error) =>
				error instanceof MutateError &&
				error.exitCode === 2 &&
				/^Mutating packages\/cli with --diff needs at least one changed test file\.\n/.test(
					error.message,
				),
		);
		assert.deepEqual(run.calls, []);
		assert.equal(existsSync(path.join(tempRepo(), '.stryker-tmp')), false);
	});

	// The plan, the run and the sandbox mirror all use the repo that main gets.
	it('runs the changed lines of each package of the repo it is given', async () => {
		writeTree(tempRepo(), SAMPLE_REPO);
		const source = 'packages/@n8n/instance-ai/src/utils/model-config-id.ts';
		const run = await runMain({
			raw: report(['Killed']),
			argv: ['--diff'],
			git: gitChanged([source]),
			repoRoot: tempRepo(),
		});
		assert.equal(run.code, 0);
		assert.equal(run.calls.length, 1);
		const pkgDir = path.join(tempRepo(), 'packages/@n8n/instance-ai');
		assert.equal(run.calls[0].options.cwd, pkgDir);
		const config = JSON.parse(
			readFileSync(path.join(pkgDir, 'reports/mutation/stryker.run.json'), 'utf8'),
		);
		assert.deepEqual(config.mutate, [`${path.join('src', 'utils', 'model-config-id.ts')}:2-4`]);
		const mirrorParent = path.join(tempRepo(), '.stryker-tmp');
		assert.match(path.relative(mirrorParent, config.tempDirName), /^mirror-[^/]+\/packages\/@n8n$/);
		assert.equal(existsSync(mirrorParent), false);
		assert.match(
			run.stderr,
			/\n {2}summary: packages\/@n8n\/instance-ai\/reports\/mutation\/summary\.json\n/,
		);
	});
});

describe('reportResults', () => {
	const passed = {
		packageDir: 'packages/a',
		summaryPath: 'packages/a/reports/mutation/summary.json',
		summary: buildSummary(report(['Killed']), {
			threshold: 80,
			target: 'src/a.ts',
			generatedAt: '2026-01-01T00:00:00.000Z',
			testRunner: 'vitest-compat',
		}),
	};

	function gate(results) {
		const lines = [];
		const code = reportResults(results, (line) => lines.push(line));
		return { code, text: lines.join('\n') };
	}

	it('prints each run and passes when every run passed', () => {
		const { code, text } = gate([passed]);
		assert.equal(code, 0);
		assert.match(text, /\n {2}summary: packages\/a\/reports\/mutation\/summary\.json\n/);
		assert.match(text, /\nGate: PASS /);
	});

	// One run without a report makes the whole result a broken toolchain.
	it('exits 3 when any run produced no valid report, even when another run passed', () => {
		const { code, text } = gate([{ packageDir: 'packages/b', failed: true }, passed]);
		assert.equal(code, 3);
		assert.match(text, /summary: packages\/a\/reports\/mutation\/summary\.json/);
		assert.match(text, /\nGate: ERROR — at least one Stryker run produced no valid report\.$/);
	});
});
