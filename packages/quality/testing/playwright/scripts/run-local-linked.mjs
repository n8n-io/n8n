#!/usr/bin/env node
/**
 * Run the Assistant e2e specs in `tests/e2e/future-poc/` against two n8n
 * processes from the local build:
 *
 *   - "This computer" on http://localhost:5678 (task-runner broker 5690). It
 *     has the Assistant, with the scripted LLM on 127.0.0.1:$SCRIPTED_LLM_PORT
 *     (default 5799) as its model and a fake sandbox service on
 *     127.0.0.1:$SANDBOX_SERVICE_PORT (default 5798). The specs start both.
 *   - "Cloud" on http://127.0.0.1:5680 (task-runner broker 5691).
 *
 * Each instance gets a throwaway N8N_USER_FOLDER and a log file under the OS
 * temp dir. The runner waits until both answer `POST /rest/e2e/reset`, runs
 * Playwright with one worker, then stops both process groups and removes the
 * folders, also on Ctrl-C and on failure. On failure it keeps the logs and
 * prints their paths and last lines.
 *
 * n8n needs Node.js 24 or later. Set N8N_NODE_BIN to its binary when `node` on
 * PATH is older. Playwright itself runs on the Node.js that runs this script.
 *
 * Usage:
 *   pnpm test:future-poc [<playwright args>]
 *   N8N_NODE_BIN=/opt/node24/bin/node pnpm test:future-poc --grep "scripted model"
 *
 * Extra n8n variables: N8N_TEST_ENV_LOCAL and N8N_TEST_ENV_CLOUD (JSON objects).
 * See tests/e2e/future-poc/README.md for all variables.
 */

import { spawn, spawnSync } from 'child_process';
import { closeSync, mkdtempSync, openSync, readFileSync } from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

import {
	CLOUD_INSTANCE,
	DEFAULT_SANDBOX_SERVICE_PORT,
	DEFAULT_SCRIPTED_LLM_PORT,
	LOCAL_INSTANCE,
	assertNodeVersion,
	baseInstanceEnv,
	buildInstanceEnv,
	buildPlaywrightArgs,
	buildPlaywrightEnv,
	cloudEnv,
	instanceUrl,
	localAssistantEnv,
	parseExtraEnv,
	parsePort,
	resolveNodeBin,
	tailLines,
} from './local-linked-config.mjs';
import {
	isPortFree,
	removeDir,
	signalProcessGroup,
	stopProcessGroup,
	waitForN8n,
	waitForReadiness,
} from './local-n8n-process.mjs';

const TAG = '[run-local-linked]';
const LOG_TAIL_LINES = 40;
// Two instances start at the same time and run migrations, so allow more than one.
const STARTUP_TIMEOUT_MS = 180_000;
// Playwright stops the running test and its fixtures on SIGINT. After this, the runner kills it.
const PLAYWRIGHT_STOP_GRACE_MS = 15_000;

const playwrightDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(playwrightDir, '../../../..');
const n8nBin = path.join(repoRoot, 'packages/cli/bin/n8n');

/** @type {Array<{ name: string, url: string, userFolder: string, logFile: string, child?: import('child_process').ChildProcess }>} */
const instances = [];
/** @type {import('child_process').ChildProcess | undefined} */
let playwright;
let logDir;
let finishing;

function readConfig() {
	const nodeBin = resolveNodeBin(process.env);
	const probe = spawnSync(nodeBin, ['-p', 'process.versions.node'], { encoding: 'utf8' });
	if (probe.error || probe.status !== 0) {
		throw new Error(`Cannot run "${nodeBin}". Set N8N_NODE_BIN to a Node.js 24 binary.`);
	}
	assertNodeVersion(probe.stdout, nodeBin);
	return {
		nodeBin,
		llmPort: parsePort(
			process.env.SCRIPTED_LLM_PORT,
			DEFAULT_SCRIPTED_LLM_PORT,
			'SCRIPTED_LLM_PORT',
		),
		sandboxPort: parsePort(
			process.env.SANDBOX_SERVICE_PORT,
			DEFAULT_SANDBOX_SERVICE_PORT,
			'SANDBOX_SERVICE_PORT',
		),
		localExtraEnv: parseExtraEnv(process.env.N8N_TEST_ENV_LOCAL, 'N8N_TEST_ENV_LOCAL'),
		cloudExtraEnv: parseExtraEnv(process.env.N8N_TEST_ENV_CLOUD, 'N8N_TEST_ENV_CLOUD'),
	};
}

// A busy port means another n8n could answer the readiness check, so stop early.
async function assertPortsFree({ llmPort, sandboxPort }) {
	const ports = [LOCAL_INSTANCE, CLOUD_INSTANCE].flatMap((i) => [i.port, i.brokerPort]);
	for (const port of [...ports, llmPort, sandboxPort]) {
		if (!(await isPortFree(port))) {
			throw new Error(`Port ${port} is in use. Stop the process that uses it and run again.`);
		}
	}
}

function printLogs(withTail) {
	for (const instance of instances) {
		console.error(`${TAG} ${instance.name} log: ${instance.logFile}`);
		if (!withTail) continue;
		try {
			const tail = tailLines(readFileSync(instance.logFile, 'utf8'), LOG_TAIL_LINES);
			console.error(`${TAG} last lines of the ${instance.name} log:\n${tail}`);
		} catch {
			// The log file is missing when the process did not start.
		}
	}
}

async function cleanUp(code) {
	// Stop Playwright first: its fixtures still call both instances while they stop.
	await stopProcessGroup(playwright, { signal: 'SIGINT', graceMs: PLAYWRIGHT_STOP_GRACE_MS });
	await Promise.all(instances.map(async (instance) => await stopProcessGroup(instance.child)));
	for (const instance of instances) removeDir(instance.userFolder);
	if (code === 0) {
		if (logDir) removeDir(logDir);
		return;
	}
	printLogs(code !== 130 && code !== 143);
}

/** Stop everything once, then exit with `code`. */
function finish(code, reason) {
	finishing ??= (async () => {
		if (reason) console.error(`${TAG} ${reason}`);
		await cleanUp(code);
		process.exit(code);
	})();
	return finishing;
}

function startInstance(definition, nodeBin, instanceEnv, extraEnv) {
	const userFolder = mkdtempSync(path.join(os.tmpdir(), `n8n-linked-${definition.name}-`));
	const logFile = path.join(logDir, `${definition.name}.log`);
	const instance = { name: definition.name, url: instanceUrl(definition), userFolder, logFile };
	instances.push(instance);

	const env = buildInstanceEnv({
		parentEnv: process.env,
		nodeBin,
		instanceEnv: { ...baseInstanceEnv(definition, userFolder), ...instanceEnv },
		extraEnv,
	});
	const logFd = openSync(logFile, 'a');
	// `detached: true` gives n8n its own process group, so the runner can stop
	// the task runner too. The group does not get the Ctrl-C of the terminal.
	instance.child = spawn(nodeBin, [n8nBin, 'start'], {
		cwd: repoRoot,
		env,
		stdio: ['ignore', logFd, logFd],
		detached: true,
	});
	closeSync(logFd);
	instance.child.on('error', (error) => {
		void finish(1, `${instance.name} n8n did not start: ${error.message}`);
	});
	instance.child.on('exit', (exitCode, signal) => {
		void finish(1, `${instance.name} n8n exited early (code=${exitCode} signal=${signal})`);
	});
	console.log(`${TAG} starting ${instance.name} n8n on ${instance.url}`);
	console.log(`${TAG}   user folder: ${userFolder}`);
	console.log(`${TAG}   log: ${logFile}`);
}

async function startInstances(config) {
	logDir = mkdtempSync(path.join(os.tmpdir(), 'n8n-linked-logs-'));
	const localEnv = localAssistantEnv(config);
	startInstance(LOCAL_INSTANCE, config.nodeBin, localEnv, config.localExtraEnv);
	startInstance(CLOUD_INSTANCE, config.nodeBin, cloudEnv(), config.cloudExtraEnv);
	await Promise.all(
		instances.map(async (instance) => {
			await waitForReadiness(instance.url, STARTUP_TIMEOUT_MS);
			await waitForN8n(instance.url, STARTUP_TIMEOUT_MS);
		}),
	);
	console.log(`${TAG} both instances are ready`);
}

function runPlaywright(config) {
	const args = buildPlaywrightArgs(process.argv.slice(2));
	console.log(`${TAG} pnpm ${args.join(' ')}`);
	// Own process group, so the runner can stop pnpm, Playwright, its workers and
	// browsers together. The runner forwards Ctrl-C to it in `cleanUp`.
	playwright = spawn('pnpm', args, {
		cwd: playwrightDir,
		stdio: ['ignore', 'inherit', 'inherit'],
		env: buildPlaywrightEnv(process.env, config),
		detached: true,
	});
	return new Promise((resolve) => {
		playwright.on('error', () => resolve(1));
		playwright.on('exit', (code) => resolve(code ?? 1));
	});
}

process.on('SIGINT', () => void finish(130, 'interrupted'));
process.on('SIGTERM', () => void finish(143, 'terminated'));
// Last resort when the runner fails before `finish`: kill without waiting.
process.on('exit', () => {
	if (finishing) return;
	signalProcessGroup(playwright, 'SIGKILL');
	for (const instance of instances) {
		signalProcessGroup(instance.child, 'SIGKILL');
		removeDir(instance.userFolder);
	}
});

try {
	const config = readConfig();
	await assertPortsFree(config);
	await startInstances(config);
	const code = await runPlaywright(config);
	await finish(code, code === 0 ? undefined : `playwright exited with code ${code}`);
} catch (error) {
	await finish(1, error instanceof Error ? error.message : String(error));
}
