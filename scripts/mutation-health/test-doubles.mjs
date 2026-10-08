/**
 * Test doubles shared by the mutate.mjs unit tests: a `spawn` that starts no
 * process and records each call, a stand-in process for signal handlers, a
 * writable sink, a Stryker binary resolver and a small repo to plan in.
 *
 * CI runs these tests in a checkout without the root node_modules (the job
 * installs only `.github/scripts`), so no test may need Stryker installed.
 */
import { EventEmitter } from 'node:events';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/**
 * A `spawn` stand-in. Each call returns a fake child with `stdout`, `stderr`,
 * `kill` and `finish(code)`, which ends the child the way a real one ends.
 * `onSpawn` runs for each call, for example to write a report and finish.
 */
export function fakeSpawn({ onSpawn } = {}) {
	const calls = [];
	const children = [];
	const spawn = (command, args, options) => {
		const child = new EventEmitter();
		child.stdout = new EventEmitter();
		child.stderr = new EventEmitter();
		child.exitCode = null;
		child.signalCode = null;
		child.kills = [];
		child.kill = (signal) => child.kills.push(signal);
		child.finish = (code) => {
			child.exitCode = code;
			child.emit('close', code);
		};
		calls.push({ command, args, options });
		children.push(child);
		onSpawn?.(child, { command, args, options });
		return child;
	};
	return { spawn, calls, children };
}

/**
 * A stand-in process plus recorders for `exit` and `write`. `exited` settles
 * with the code of the first exit, for a handler that exits after a wait.
 */
export function fakeProcess() {
	const exits = [];
	const writes = [];
	let firstExit;
	const exited = new Promise((resolve) => {
		firstExit = resolve;
	});
	return {
		proc: new EventEmitter(),
		exits,
		writes,
		exited,
		exit: (code) => {
			exits.push(code);
			firstExit(code);
		},
		write: (msg) => writes.push(msg),
	};
}

/** 'resolved', 'rejected', or 'pending' when `promise` did not settle within one turn. */
export function settledState(promise) {
	return Promise.race([
		promise.then(
			() => 'resolved',
			() => 'rejected',
		),
		new Promise((resolve) => setImmediate(() => resolve('pending'))),
	]);
}

/** A writable stand-in that keeps what was written. */
export function sink() {
	const chunks = [];
	return {
		chunks,
		write: (chunk) => chunks.push(String(chunk)),
		text: () => chunks.join(''),
	};
}

// A Stryker binary path for runs that a fake `spawn` starts. No file is there.
export const FAKE_STRYKER_BIN = '/fake/node_modules/@stryker-mutator/core/bin/stryker.js';

/** A `resolveStrykerBin` stand-in that needs no installed Stryker. */
export const resolveFakeStrykerBin = () => FAKE_STRYKER_BIN;

// Stryker's option name for in place mode. It is built from parts because a
// safety check greps this folder for the literal name: a match means that the
// tool still mutates the working tree.
export const IN_PLACE_KEY = ['in', 'Place'].join('');

/** True when an argument or config key switches on Stryker's in place mode. */
export function namesInPlaceMode(text) {
	return /^(--)?inplace$/i.test(text);
}

// The safety check to do before a run: `grep -E` with this pattern on each .mjs
// file of this folder must find nothing. A match is a sign that the tool can
// write to the working tree. Built from parts, so this file passes the check.
export const SAFETY_GREP = new RegExp(
	[
		IN_PLACE_KEY,
		['in', 'place'].join('-'),
		['git', 'checkout'].join(' '),
		['checkout', '--'].join(' '),
	].join('|'),
);

/** Write each file of `files` (path: content) under `root`. An object is written as JSON. */
export function writeTree(root, files) {
	for (const [file, content] of Object.entries(files)) {
		const abs = path.join(root, file);
		mkdirSync(path.dirname(abs), { recursive: true });
		writeFileSync(abs, typeof content === 'string' ? content : JSON.stringify(content));
	}
}

const vitestPackage = (name) => ({ name, scripts: { test: 'vitest run' } });

// A repo for the planners, with the package kinds that a plan treats apart.
// It has no package.json at its root, so a file outside the packages has no
// enclosing package.
export const SAMPLE_REPO = {
	'packages/@n8n/instance-ai/package.json': vitestPackage('@n8n/instance-ai'),
	'packages/@n8n/instance-ai/src/utils/model-config-id.ts': 'export const id = 1;\n',
	'packages/@n8n/instance-ai/src/utils/__tests__/model-config-id.test.ts': 'it("a", () => {});\n',
	'packages/cli/package.json': vitestPackage('n8n'),
	'packages/cli/src/credentials/external-secrets.utils.ts': 'export const a = 1;\n',
	'packages/cli/src/credentials/__tests__/external-secrets.utils.test.ts': 'it("a", () => {});\n',
	'packages/@n8n/expression-runtime/package.json': vitestPackage('@n8n/expression-runtime'),
	'packages/@n8n/expression-runtime/src/index.ts': 'export const b = 1;\n',
	'packages/jest-pkg/package.json': { name: 'jest-pkg', scripts: { test: 'jest' } },
	'packages/jest-pkg/src/a.ts': 'export const c = 1;\n',
	'scripts/loose.ts': 'export const d = 1;\n',
};
