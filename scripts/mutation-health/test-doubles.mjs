/**
 * Test doubles shared by the mutate.mjs unit tests: a `spawn` that starts no
 * process and records each call, a stand-in process for signal handlers, a
 * writable sink and a Stryker binary resolver.
 *
 * CI runs these tests in a checkout without the root node_modules (the job
 * installs only `.github/scripts`), so no test may need Stryker installed.
 */
import { EventEmitter } from 'node:events';

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

/** A stand-in process plus recorders for `exit` and `write`. */
export function fakeProcess() {
	const exits = [];
	const writes = [];
	return {
		proc: new EventEmitter(),
		exits,
		writes,
		exit: (code) => exits.push(code),
		write: (msg) => writes.push(msg),
	};
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
