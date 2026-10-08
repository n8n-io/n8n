/**
 * Build and start one Stryker run. Runs always use Stryker's sandbox: Stryker
 * copies the package into a temp dir under `.stryker-tmp/` and mutates the
 * copy (see sandbox-mirror.mjs for where). The working tree is never written,
 * so nothing has to be restored after a run.
 *
 * The run has one of two test runners:
 *   - `vitest-compat` (the default): Stryker's vitest runner, made to work with
 *     Vitest 5 (see vitest-compat.mjs). It records which tests cover each
 *     mutant and runs only those, so a run takes seconds.
 *   - `command` (`--test-command`): runs a shell command once per mutant. It
 *     works for a package without a vitest `test` script, but it runs every
 *     named test for each mutant and records no coverage, so it is slow.
 */
import { spawn as nodeSpawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { MutateError, defaultConfigNameFor, repoRoot } from './targets.mjs';
import { COMPAT_RUNNER_NAME } from './vitest-compat.mjs';

const VITEST_RUNNER_PLUGIN = '@stryker-mutator/vitest-runner';
export const COMPAT_RUNNER_PLUGIN = path.join(import.meta.dirname, 'vitest-compat-runner.mjs');

// mutate.mjs reads the raw report from here, relative to the package dir.
export const RAW_REPORT = 'reports/mutation/raw.json';

// Folders at the package root that no test reads. Without this, Stryker copies
// them into each sandbox.
const SANDBOX_IGNORE = [
	'/reports/mutation',
	'/coverage',
	'/test-results',
	'/playwright-report',
	'/.playwright-browsers',
	'/ms-playwright-cache',
];

// Stryker's option for in place mode, matched in any letter case.
const IN_PLACE_OPTION = /^inplace$/i;

const unique = (items) => [...new Set(items)];

/**
 * The config file for a run: `--config`, then the package's own config, then
 * the shared config for the package. `root` is the repo that a relative
 * `--config` and the package dir are read from.
 */
export function resolveConfig(pkgRoot, configArg, root = repoRoot) {
	if (configArg) return path.resolve(root, configArg);
	const local = path.join(pkgRoot, 'stryker.config.mjs');
	if (existsSync(local)) return local;
	return path.join(import.meta.dirname, defaultConfigNameFor(path.relative(root, pkgRoot)));
}

// Try the package's own copy first, then the root devDep. A package that pins
// Stryker thus gets the version it pinned. A miss is a broken checkout, not a
// red gate: exit 3 keeps it distinct from a score of zero. `rootFrom` is the
// file the root devDep resolves from; the unit tests point it at a temp dir.
export function resolveStrykerBin(pkgRoot, packageDir, { rootFrom = import.meta.url } = {}) {
	for (const from of [path.join(pkgRoot, 'package.json'), rootFrom]) {
		try {
			const resolved = createRequire(from).resolve('@stryker-mutator/core/package.json');
			return path.join(path.dirname(resolved), 'bin/stryker.js');
		} catch {
			continue;
		}
	}
	throw new MutateError(
		3,
		`Could not resolve @stryker-mutator/core from ${packageDir} or the repo root. ` +
			'Run `pnpm install` — it is a root devDep.',
	);
}

/** Read a Stryker config file the way Stryker does: JSON, or a module's default export. */
export async function loadBaseConfig(configPath) {
	if (!existsSync(configPath)) throw new MutateError(2, `Stryker config not found: ${configPath}`);
	try {
		if (configPath.endsWith('.json')) return JSON.parse(readFileSync(configPath, 'utf8'));
		const module = await import(pathToFileURL(configPath).href);
		return module.default ?? {};
	} catch (error) {
		throw new MutateError(2, `Could not read the Stryker config ${configPath}: ${error.message}`);
	}
}

function workingTreeModeError(base, configLabel) {
	const option = Object.keys(base).find((key) => IN_PLACE_OPTION.test(key));
	if (!option || !base[option]) return null;
	return (
		`${configLabel} sets "${option}", which makes Stryker write mutants into the working tree.\n` +
		'mutate.mjs runs Stryker only in its sandbox copy of the package. Remove the option.'
	);
}

// The TypeScript checker type-checks with the file that `tsconfigFile` names.
// A run in the mirror sets that option to a file that does not exist (see
// NO_TSCONFIG_REWRITE), so the checker cannot work there.
function typescriptCheckerError(base, configLabel) {
	if (!Array.isArray(base.checkers) || !base.checkers.includes('typescript')) return null;
	return (
		`${configLabel} uses the "typescript" checker, which mutate.mjs does not support.\n` +
		"mutate.mjs turns off Stryker's tsconfig rewrite (tsconfigFile), and the checker needs that " +
		'file. Remove "typescript" from "checkers".'
	);
}

/** Why a config cannot run, or null when it can. `configLabel` names the file. */
export function sandboxConfigError(base, configLabel) {
	return workingTreeModeError(base, configLabel) ?? typescriptCheckerError(base, configLabel);
}

function shellQuote(arg) {
	return /^[\w@%+=:,./-]+$/.test(arg) ? arg : `'${arg.replaceAll("'", "'\\''")}'`;
}

/** The test command with its file arguments, each quoted for the shell. */
export function toCommandLine(command, args = []) {
	return [command.trim(), ...args.map(shellQuote)].join(' ');
}

/**
 * Keep each runner's incremental results in their own file. The runners name
 * tests differently, so results from one cannot be reused by the other. This
 * also drops the results that the plain vitest runner recorded under Vitest 5,
 * when no mutant was ever killed.
 */
export function runnerIncrementalFile(file, runner) {
	const ext = path.extname(file);
	return `${file.slice(0, file.length - ext.length)}.${runner}${ext}`;
}

function incrementalFields(base, runner) {
	if (!base.incremental) return {};
	const file = base.incrementalFile ?? 'reports/stryker-incremental.json';
	return { incrementalFile: runnerIncrementalFile(file, runner) };
}

// Stryker rewrites each tsconfig path that leaves the package, because its
// default sandbox sits two levels below the package. A sandbox in the mirror
// (see sandbox-mirror.mjs) has the package's own depth, so those paths are
// already right. Stryker rewrites only the file that `tsconfigFile` names, so
// a name that matches no file turns the rewrite off.
export const NO_TSCONFIG_REWRITE = 'tsconfig.no-stryker-rewrite.json';

function sandboxFields(tempDir) {
	return tempDir ? { tempDirName: tempDir, tsconfigFile: NO_TSCONFIG_REWRITE } : {};
}

function runFields(base, { targets, tempDir }) {
	return {
		mutate: [...targets],
		...sandboxFields(tempDir),
		// Also remove the sandbox after a failed run: a copy of a large package
		// costs disk space, and the report does not need it.
		cleanTempDir: 'always',
		ignorePatterns: unique([...(base.ignorePatterns ?? []), ...SANDBOX_IGNORE]),
		reporters: unique([...(base.reporters ?? ['clear-text']), 'json']),
		jsonReporter: { ...base.jsonReporter, fileName: RAW_REPORT },
	};
}

function commandRunnerFields(base, testCommand, testFiles) {
	return {
		...incrementalFields(base, 'command'),
		testRunner: 'command',
		commandRunner: { command: toCommandLine(testCommand, testFiles) },
		// The command passes or fails as a whole, so there is no per-test coverage.
		coverageAnalysis: 'off',
		// Stryker finds static mutants only through per-test coverage.
		ignoreStatic: false,
	};
}

function usesVitestRunner(base) {
	return [undefined, 'vitest', COMPAT_RUNNER_NAME].includes(base.testRunner);
}

function vitestRunnerFields(base) {
	return {
		...incrementalFields(base, COMPAT_RUNNER_NAME),
		testRunner: COMPAT_RUNNER_NAME,
		plugins: unique([...(base.plugins ?? []), VITEST_RUNNER_PLUGIN, COMPAT_RUNNER_PLUGIN]),
	};
}

/**
 * The whole config for one run: the resolved config file plus this run's
 * fields. A config with the vitest runner gets the `vitest-compat` runner.
 * Test files go to Stryker's `testFiles` field for that runner. The command
 * runner does not accept `testFiles`, so they go onto the end of the command.
 * `tempDir`, when given, is where Stryker puts its sandbox.
 */
export function buildStrykerConfig({ base = {}, targets, testFiles = [], testCommand, tempDir }) {
	if (testCommand !== undefined) {
		const { testFiles: _notForCommandRunner, ...rest } = base;
		return {
			...rest,
			...runFields(base, { targets, tempDir }),
			...commandRunnerFields(base, testCommand, testFiles),
		};
	}
	const config = { ...base, ...runFields(base, { targets, tempDir }) };
	if (usesVitestRunner(base)) Object.assign(config, vitestRunnerFields(base));
	if (testFiles.length > 0) config.testFiles = [...testFiles];
	return config;
}

/**
 * Write the run config next to the reports. It is the exact config Stryker
 * reads, so it can name a sandbox mirror that exists only during the run.
 */
export async function writeRunConfig(reportDir, config) {
	const file = path.join(reportDir, 'stryker.run.json');
	await writeFile(file, `${JSON.stringify(config, null, 2)}\n`);
	return file;
}

/** The arguments for `node` that start Stryker on a run config, and nothing else. */
export function strykerRunArgv(strykerBin, runConfigPath) {
	return [strykerBin, 'run', runConfigPath];
}

export function exitCodeForSignal(signal) {
	return signal === 'SIGTERM' ? 143 : 130;
}

// How long the tool waits after a crash for a live Stryker to stop. On SIGINT
// Stryker saves its incremental results and exits, which takes about a second.
// The limit keeps a Stryker that does not stop from holding the tool.
export const CRASH_STOP_GRACE_MS = 10_000;

const writeStderr = (msg) => process.stderr.write(msg);

/**
 * Handle a crash and a cancellation during a run.
 *
 * `onSignal` gets first refusal on SIGINT and SIGTERM. It returns true when it
 * told a live Stryker to stop: the run then exits once Stryker is gone, and
 * the caller's `finally` removes the mirror with Stryker's sandbox in it.
 * Otherwise this handler exits at once.
 *
 * `onCrash` runs on an uncaught exception. When it returns a promise, the exit
 * waits until the promise settles, for example until a live Stryker is gone.
 * A second crash while it waits does not exit again.
 *
 * `onExit` runs before each exit that these handlers make. An exit skips every
 * `finally` block, so `onExit` does the cleanup that a `finally` would do. A
 * failed cleanup is printed and the exit code stays the same.
 *
 * `proc`, `exit` and `write` are injected so the unit tests can drive the
 * handlers without signalling or ending the test runner.
 */
export function registerSignalHandlers({
	onSignal,
	onCrash,
	onExit,
	proc = process,
	exit = (code) => process.exit(code),
	write = writeStderr,
}) {
	const leave = (code) => {
		try {
			onExit?.();
		} catch (error) {
			write(`\n✗ Cleanup before exit failed: ${error?.message ?? error}\n`);
		}
		exit(code);
	};
	let waitingAfterCrash = false;
	const handleUncaught = (err) => {
		write(`\n✗ mutate.mjs crashed: ${err?.stack ?? err}\n`);
		if (waitingAfterCrash) return;
		const stopped = onCrash?.();
		if (!stopped) {
			leave(3);
			return;
		}
		waitingAfterCrash = true;
		const leaveAfterCrash = () => leave(3);
		stopped.then(leaveAfterCrash, leaveAfterCrash);
	};
	const handleSignal = (signal) => {
		if (onSignal?.(signal)) return;
		leave(exitCodeForSignal(signal));
	};
	const handleSigint = () => handleSignal('SIGINT');
	const handleSigterm = () => handleSignal('SIGTERM');

	proc.on('uncaughtException', handleUncaught);
	proc.on('SIGINT', handleSigint);
	proc.on('SIGTERM', handleSigterm);

	return {
		dispose() {
			proc.off('uncaughtException', handleUncaught);
			proc.off('SIGINT', handleSigint);
			proc.off('SIGTERM', handleSigterm);
		},
	};
}

/**
 * Handlers for the parts of a job before and after Stryker runs. There, a
 * signal or a crash exits at once, after `io.onExit`. While Stryker runs,
 * runStryker has its own handlers: call `release` just before runStryker and
 * `hold` once it settles, so only one set of handlers listens at a time.
 * `io` takes the same fields as registerSignalHandlers.
 */
export function guardOutsideStryker(io) {
	let handlers = registerSignalHandlers(io);
	return {
		hold() {
			handlers ??= registerSignalHandlers(io);
		},
		release() {
			handlers?.dispose();
			handlers = null;
		},
	};
}

function isRunning(child) {
	return child.exitCode === null && child.signalCode === null;
}

// Tell a live Stryker to stop. Settles once it is gone, or after `graceMs`.
function stopWithin(child, graceMs) {
	return new Promise((resolve) => {
		const timer = setTimeout(resolve, graceMs);
		child.once('close', () => {
			clearTimeout(timer);
			resolve();
		});
		child.kill('SIGINT');
	});
}

// The handlers while Stryker runs. `run` records a cancel and a crash.
function strykerHandlers(child, run, { onExit, crashStopGraceMs, ...handlerIo }) {
	const write = handlerIo.write ?? writeStderr;
	return registerSignalHandlers({
		...handlerIo,
		onSignal: (signal) => {
			if (!isRunning(child)) return false;
			run.cancelledBy = signal;
			child.kill('SIGINT');
			return true;
		},
		// The run does not go on after a crash. A live Stryker gets a short time
		// to stop, so the cleanup does not remove the mirror while Stryker uses it.
		onCrash: () => {
			run.crashed = true;
			if (!isRunning(child)) return null;
			write(`Waiting up to ${crashStopGraceMs / 1000} s for Stryker to stop before the cleanup.\n`);
			return stopWithin(child, crashStopGraceMs);
		},
		// Stop a Stryker that is still alive, so it does not run on without the tool.
		onExit: () => {
			if (isRunning(child)) child.kill('SIGINT');
			onExit?.();
		},
	});
}

/**
 * Start Stryker and wait until it is gone. Its output streams through and is
 * also kept, so the caller can classify the run. `cancelledBy` names the
 * signal that stopped the run, or is null. `spawn` and the streams are
 * injected so the unit tests can check the command without starting Stryker.
 * `onExit` is the caller's cleanup for an exit while Stryker runs (see
 * registerSignalHandlers). After a crash the promise never settles: the crash
 * handler ends the process once Stryker is gone or `crashStopGraceMs` passed.
 */
export function runStryker({ argv, cwd }, io = {}) {
	const {
		spawn = nodeSpawn,
		stdout = process.stdout,
		stderr = process.stderr,
		crashStopGraceMs = CRASH_STOP_GRACE_MS,
		...handlerIo
	} = io;
	return new Promise((resolve, reject) => {
		const chunks = [];
		const run = { cancelledBy: null, crashed: false };
		const child = spawn(process.execPath, argv, { cwd, stdio: ['inherit', 'pipe', 'pipe'] });
		const handlers = strykerHandlers(child, run, { ...handlerIo, crashStopGraceMs });
		const keep = (sink) => (chunk) => {
			chunks.push(Buffer.from(chunk));
			sink.write(chunk);
		};
		child.stdout.on('data', keep(stdout));
		child.stderr.on('data', keep(stderr));
		child.on('error', (err) => {
			if (run.crashed) return;
			handlers.dispose();
			reject(new MutateError(3, `Stryker failed to start: ${err.message}`));
		});
		child.on('close', (code) => {
			if (run.crashed) return;
			handlers.dispose();
			const output = Buffer.concat(chunks).toString('utf8');
			resolve({ exitCode: code ?? 1, output, cancelledBy: run.cancelledBy });
		});
	});
}
