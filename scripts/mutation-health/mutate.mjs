#!/usr/bin/env node
/**
 * Run Stryker over a workspace package and write an actionable summary. This
 * script works for any package. Run it as `pnpm mutate` from the repo root.
 *
 *   pnpm mutate <file>[:<start>-<end>] [--package-dir <dir>] [--config <path>]
 *                                     [--test-files <path>[,<path>…]] [--test-command <cmd>]
 *   pnpm mutate --diff [--base <ref>] [--config <path>]
 *
 * Use `--diff` before you merge. It reads the changed line ranges from
 * `git diff -U0 $(git merge-base <base> HEAD)`, which covers committed branch
 * work and uncommitted edits. It mutates only those lines, in one Stryker run
 * per package. This makes the gate apply to the patch: it scores the lines you
 * changed, not the debt you inherited.
 *
 * Use `--test-files` to name the test files that must kill the mutants. Stryker
 * then runs those files instead of the whole related-test graph. The flag
 * repeats and it also takes a comma-separated list. Named `packages/cli`
 * targets require it; `--diff` uses the CLI test files changed in the patch.
 *
 * Use `--test-command` for a package whose `test` script does not run vitest.
 * Stryker's command runner then runs the command, plus the test files, once
 * per mutant. See stryker.mjs for the two runners and their cost.
 *
 * Every run uses Stryker's sandbox: Stryker mutates a copy of the package
 * under `.stryker-tmp/`, never the working tree, so nothing is restored after
 * a run and other work in the tree is safe while a run is in flight. The
 * sandbox sits in a mirror of the repo (see sandbox-mirror.mjs). The tool
 * removes the mirror after each run, also when a signal or a crash stops it.
 *
 * Stryker config resolution (first match wins):
 *   1. --config <path>                    explicit override
 *   2. <package-dir>/stryker.config.mjs   package-local (e.g. workflow's vm carve-out)
 *   3. stryker.cli.mjs                    packages/cli only (related-test discovery off)
 *   4. stryker.default.mjs                shared default (the package's own vitest config)
 *
 * Outputs (under <package-dir>/reports/mutation/):
 *   stryker.run.json — the exact config this run gave Stryker, to read. It can
 *                      name a sandbox mirror that is gone after the run, so
 *                      repeat a run with this script, not with `stryker run`.
 *   raw.json      — full Stryker Mutation Testing Elements report
 *   summary.json  — compact actionable summary (this script), with a `coverage`
 *                   fraction in [0,1] for each file. Also written when Stryker
 *                   fails after a (partial) raw.json, so a run that cannot finish
 *                   still shows the survivors it found.
 *
 * Gate semantics:
 *   A run passes only when the score meets `STRYKER_THRESHOLD` and no mutant
 *   survives without a reason. To give a reason, add a `// Stryker disable …`
 *   comment. Stryker then reports the mutant as `Ignored` and keeps it out of
 *   the score. Each `Survived` or `NoCoverage` mutant fails the gate, also
 *   above the threshold. The score alone lets an author add weak tests to reach
 *   80% and leave real gaps. See DEVP-442.
 *
 * Exit codes:
 *   0  — the gate passed.
 *   1  — the gate failed. Iterate: read summary.json and strengthen the tests.
 *   2  — usage or config error.
 *   3  — Stryker did not resolve or did not run, or its test runner ran no
 *        test for a mutant that tests cover. Never 1: a broken toolchain must
 *        stay distinct from a score of zero.
 *   130 / 143 — the run was cancelled with SIGINT / SIGTERM.
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { diffPlanLines, planFromDiff, planFromTarget } from './plan.mjs';
import { createSandboxMirror } from './sandbox-mirror.mjs';
import {
	RAW_REPORT,
	buildStrykerConfig,
	exitCodeForSignal,
	guardOutsideStryker,
	loadBaseConfig,
	resolveConfig,
	resolveStrykerBin,
	runStryker,
	sandboxConfigError,
	strykerRunArgv,
	writeRunConfig,
} from './stryker.mjs';
import {
	buildNoTestsSummary,
	buildSummary,
	classifyRun,
	mutantCountFromOutput,
	overallGate,
	reportLines,
	testsNotRunLines,
} from './summary.mjs';
import {
	CLI_PACKAGE_DIR,
	MutateError,
	cliScopeError,
	formatMutateArg,
	parseTestFiles,
	repoRoot,
	toPackageRelative,
} from './targets.mjs';

const THRESHOLD = Number(process.env.STRYKER_THRESHOLD ?? 80);

// Where the sandbox mirrors of a repo go. git ignores `.stryker-tmp/`.
const mirrorParentFor = (root) => path.join(root, '.stryker-tmp');

export const USAGE = `Usage:
  node scripts/mutation-health/mutate.mjs <file>[:<start>-<end>] [--package-dir <dir>] [--config <path>]
                                          [--test-files <path>[,<path>...]] [--test-command <cmd>]
  node scripts/mutation-health/mutate.mjs --diff [--base <ref>] [--config <path>]

Options:
  --package-dir <dir>   Package the target belongs to. Inferred when omitted.
  --config <path>       Stryker config file. Overrides the resolution order.
  --base <ref>          Branch point --diff measures against. Default origin/master.
  --diff                Mutate every line this branch changed, one run per package.
  --test-files <paths>  Test files Stryker runs, instead of the whole related-test
                        graph. Comma-separated, and the flag repeats. Paths may be
                        repo-relative or package-relative. Required for
                        ${CLI_PACKAGE_DIR} targets.
  --test-command <cmd>  Shell command that runs the package's tests, for a package
                        whose \`test\` script does not run vitest. Runs in the
                        package dir once per mutant, with the --test-files paths
                        added at the end. Much slower than the default runner.
                        Needs a single target.

  # one file, whole
  node scripts/mutation-health/mutate.mjs packages/@n8n/crdt/src/utils.ts
  # one file, only lines 40-75
  node scripts/mutation-health/mutate.mjs packages/@n8n/crdt/src/utils.ts:40-75
  # package-relative target
  node scripts/mutation-health/mutate.mjs src/cron.ts --package-dir packages/workflow
  # a cli target, scoped to the tests that must kill its mutants
  node scripts/mutation-health/mutate.mjs packages/cli/src/credentials/external-secrets.utils.ts:32-68 \\
    --test-files packages/cli/src/credentials/__tests__/external-secrets.utils.test.ts
  # a package with no vitest \`test\` script
  node scripts/mutation-health/mutate.mjs packages/quality/testing/playwright/coverage-options.ts \\
    --test-files coverage-options.test.ts --test-command 'pnpm exec vitest run'
  # every line this branch changed, batched one Stryker run per package
  node scripts/mutation-health/mutate.mjs --diff --base origin/master`;

// Flags that take one value, and the field each value goes to.
const VALUE_FLAGS = new Map([
	['--package-dir', 'packageDirArg'],
	['--config', 'configArg'],
	['--base', 'baseArg'],
	['--test-command', 'testCommand'],
]);

const SWITCHES = new Map([
	['--diff', 'diffMode'],
	['--help', 'helpMode'],
	['-h', 'helpMode'],
]);

/**
 * Read the command line. Pure, so the unit tests can assert what each flag
 * parses to. `usageError` checks the result, and `main` owns the exit codes.
 */
export function parseArgs(argv) {
	const parsed = {
		packageDirArg: undefined,
		configArg: undefined,
		targetArg: undefined,
		baseArg: 'origin/master',
		diffMode: false,
		helpMode: false,
		testCommand: undefined,
	};
	const rawTestFiles = [];
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		// A flag with no value after it reads as an empty value. An empty command
		// is a usage error, so a run never starts on a command that was cut off.
		if (VALUE_FLAGS.has(a)) parsed[VALUE_FLAGS.get(a)] = argv[++i] ?? '';
		else if (a === '--test-files') rawTestFiles.push(argv[++i] ?? '');
		else if (SWITCHES.has(a)) parsed[SWITCHES.get(a)] = true;
		else if (!a.startsWith('--') && parsed.targetArg === undefined) parsed.targetArg = a;
	}
	return { ...parsed, testFiles: parseTestFiles(rawTestFiles) };
}

const USAGE_RULES = [
	[(a) => a.diffMode && a.targetArg, '--diff takes no positional target.'],
	[(a) => !a.diffMode && !a.targetArg, 'Missing mutate target.'],
	// --diff plans a run per package, so one test-file list cannot say which
	// package it belongs to. Refuse rather than apply it to all of them.
	[
		(a) => a.diffMode && a.testFiles.length > 0,
		'--test-files needs a single target; it does not work with --diff.',
	],
	[
		(a) => a.testCommand !== undefined && a.testCommand.trim() === '',
		"--test-command needs a command, for example --test-command 'pnpm exec vitest run'.",
	],
	// A test command runs one package's tests, for the same reason as above.
	[
		(a) => a.diffMode && a.testCommand !== undefined,
		'--test-command needs a single target; it does not work with --diff.',
	],
];

/** The first problem with the parsed command line, or null. */
export function usageError(args) {
	return USAGE_RULES.find(([applies]) => applies(args))?.[1] ?? null;
}

function selectedTestFiles(job, args) {
	return args.testFiles.length > 0 ? args.testFiles : (job.testFiles ?? []);
}

function planJobs(args, { log, git, repoRoot: root }) {
	if (!args.diffMode) {
		const customTestCommand = args.testCommand !== undefined;
		return [
			planFromTarget(args.targetArg, args.packageDirArg, { customTestCommand, repoRoot: root }),
		];
	}
	const plan = planFromDiff(args.baseArg, { git, repoRoot: root });
	for (const line of diffPlanLines(plan, args.baseArg)) log(line);
	return plan.jobs;
}

// Check the config and collect what the run needs. Nothing is written yet.
async function prepareRun(job, args, { resolveBin, root }) {
	const { pkgRoot, packageDir } = job;
	const configPath = resolveConfig(pkgRoot, args.configArg, root);
	const configLabel = path.relative(root, configPath);
	const base = await loadBaseConfig(configPath);
	const configError = sandboxConfigError(base, configLabel);
	if (configError) throw new MutateError(2, configError);
	const testFiles = selectedTestFiles(job, args).map((f) => toPackageRelative(f, packageDir));
	return { base, configLabel, testFiles, strykerBin: resolveBin(pkgRoot, packageDir) };
}

function describeRun({ packageDir, targets }, { config, configLabel }) {
	const lines = [
		`\nRunning Stryker on ${packageDir} — ${targets.length} target(s) ` +
			`(config: ${configLabel}, runner: ${config.testRunner}, threshold: ${THRESHOLD}%)`,
	];
	if (config.commandRunner) lines.push(`  command: ${config.commandRunner.command}`);
	if (config.testFiles) lines.push(`  testFiles: ${config.testFiles.join(', ')}`);
	return lines;
}

// Why a run gives no valid result, for the two toolchain failures.
function failureLines(outcome, { packageDir, run, rawJsonPath, report, root }) {
	if (outcome === 'tests-not-run') return testsNotRunLines(packageDir, report);
	return [
		`✗ ${packageDir}: Stryker exited ${run.exitCode} without producing ` +
			`${path.relative(root, rawJsonPath)}`,
	];
}

async function summariseRun(job, { config, run, rawJsonPath, summaryJsonPath, root }, log) {
	const { packageDir, targets } = job;
	const report = existsSync(rawJsonPath) ? JSON.parse(await readFile(rawJsonPath, 'utf8')) : null;
	const outcome = classifyRun({ exitCode: run.exitCode, output: run.output, report });
	const result = { packageDir, summaryPath: path.relative(root, summaryJsonPath) };
	if (outcome === 'failed' || outcome === 'tests-not-run') {
		const failure = { packageDir, run, rawJsonPath, report, root };
		for (const line of failureLines(outcome, failure)) log(line);
		return { ...result, failed: true };
	}
	const meta = {
		threshold: THRESHOLD,
		target: formatMutateArg(targets),
		generatedAt: new Date().toISOString(),
	};
	const summary =
		outcome === 'no-tests'
			? buildNoTestsSummary({ ...meta, noCoverage: mutantCountFromOutput(run.output) })
			: buildSummary(report, { ...meta, testRunner: config.testRunner });
	if (outcome === 'partial') summary.partial = true;
	await writeFile(summaryJsonPath, JSON.stringify(summary, null, 2));
	return { ...result, summary, noTests: outcome === 'no-tests' };
}

// Clear the earlier reports, write the run config and run Stryker to the end.
// runStryker handles signals while Stryker runs, so the guard steps aside.
async function startRun(job, { config, strykerBin, guard }, io) {
	const rawJsonPath = path.join(job.pkgRoot, RAW_REPORT);
	const reportDir = path.dirname(rawJsonPath);
	const summaryJsonPath = path.join(reportDir, 'summary.json');
	await mkdir(reportDir, { recursive: true });
	// Delete the previous reports first. The code below reads "raw.json exists"
	// as "this run wrote a report". A file from an earlier run makes a crashed
	// run report the earlier target and its score, and it also hides the
	// no-covering-tests result. After this, a report on disk is always this run's.
	await Promise.all([rm(rawJsonPath, { force: true }), rm(summaryJsonPath, { force: true })]);
	const runConfigPath = await writeRunConfig(reportDir, config);

	const argv = strykerRunArgv(strykerBin, runConfigPath);
	guard.release();
	const run = await runStryker({ argv, cwd: job.pkgRoot }, io).finally(() => guard.hold());
	if (run.cancelledBy) {
		throw new MutateError(
			exitCodeForSignal(run.cancelledBy),
			`\nRun cancelled by ${run.cancelledBy}.`,
		);
	}
	return { run, rawJsonPath, summaryJsonPath };
}

/**
 * Run Stryker for one planned job and summarise the result. `io` holds what the
 * run uses outside this file, so the unit tests can run a job without Stryker:
 *   - `resolveStrykerBin`: finds Stryker's binary (default: resolveStrykerBin).
 *   - `repoRoot`: the repo that the config lookup, the printed paths and the
 *     sandbox mirror use (default: this repo).
 *   - everything else (`spawn`, the output streams, the signal-handling
 *     stand-ins) goes on to runStryker.
 */
export async function runJob(job, args, io = {}) {
	const {
		resolveStrykerBin: resolveBin = resolveStrykerBin,
		repoRoot: root = repoRoot,
		...runIo
	} = io;
	const log = (line) => (runIo.stderr ?? process.stderr).write(`${line}\n`);
	const prepared = await prepareRun(job, args, { resolveBin, root });
	const mirror = createSandboxMirror(job.pkgRoot, {
		repoRoot: root,
		parentDir: mirrorParentFor(root),
	});
	// An exit on a signal or a crash skips `finally`, so the handlers remove the mirror.
	const strykerIo = { ...runIo, onExit: () => mirror?.dispose() };
	const guard = guardOutsideStryker(strykerIo);
	try {
		const config = buildStrykerConfig({
			base: prepared.base,
			targets: job.targets,
			testFiles: prepared.testFiles,
			testCommand: args.testCommand,
			tempDir: mirror?.tempDir,
		});
		for (const line of describeRun(job, { config, configLabel: prepared.configLabel })) log(line);
		const run = { config, strykerBin: prepared.strykerBin, guard };
		const finished = await startRun(job, run, strykerIo);
		return await summariseRun(job, { config, root, ...finished }, log);
	} finally {
		guard.release();
		mirror?.dispose();
	}
}

/** Print the result of each run and the gate. Returns the exit code. */
export function reportResults(results, log) {
	log('\n=== Mutation summary ===');
	for (const r of results) for (const line of reportLines(r)) log(line);

	if (results.some((r) => r.failed)) {
		log('\nGate: ERROR — at least one Stryker run produced no valid report.');
		return 3;
	}
	const overall = overallGate(results.map((r) => r.summary));
	const gateState = overall.passed ? 'PASS' : overall.partial ? 'FAIL (partial)' : 'FAIL';
	log(
		`\nGate: ${gateState}  •  threshold: ${THRESHOLD}%  •  ` +
			`unjustified survivors: ${overall.survived}  •  ignored (justified): ${overall.ignored}`,
	);
	return overall.passed ? 0 : 1;
}

/**
 * The whole command. Returns the exit code, or throws a MutateError. `io.git`
 * runs git for --diff (default: runGit). `io.repoRoot` is the repo that the
 * plan reads (default: this repo). The rest of `io`, with `repoRoot`, goes to
 * runJob.
 */
export async function main(argv, { git, ...io } = {}) {
	const log = (line) => (io.stderr ?? process.stderr).write(`${line}\n`);
	const args = parseArgs(argv);
	if (args.helpMode) {
		(io.stdout ?? process.stdout).write(`${USAGE}\n`);
		return 0;
	}
	const problem = usageError(args);
	if (problem) throw new MutateError(2, problem, { showUsage: true });

	const jobs = planJobs(args, { log, git, repoRoot: io.repoRoot });
	if (jobs.length === 0) {
		log(`\nNothing mutable changed vs ${args.baseArg}.`);
		return 0;
	}
	for (const job of jobs) {
		const scopeError = cliScopeError(job.packageDir, selectedTestFiles(job, args), args.diffMode);
		if (scopeError) throw new MutateError(2, scopeError);
	}

	const results = [];
	for (const job of jobs) results.push(await runJob(job, args, io));
	return reportResults(results, log);
}

// Print a stop the way the command line shows it, and return its exit code.
function reportStop(error) {
	if (!(error instanceof MutateError)) {
		process.stderr.write(`\n✗ mutate.mjs crashed: ${error?.stack ?? error}\n`);
		return 3;
	}
	process.stderr.write(`${error.message}\n${error.showUsage ? `${USAGE}\n` : ''}`);
	return error.exitCode;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	process.exit(await main(process.argv.slice(2)).catch(reportStop));
}
