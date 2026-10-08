import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { exitCodeForSignal, guardOutsideStryker, registerSignalHandlers } from './stryker.mjs';
import { fakeProcess } from './test-doubles.mjs';

const nextTurn = () => new Promise((resolve) => setImmediate(resolve));

describe('exitCodeForSignal', () => {
	it("gives the shell's code for each signal", () => {
		assert.equal(exitCodeForSignal('SIGINT'), 130);
		assert.equal(exitCodeForSignal('SIGTERM'), 143);
	});
});

// Handlers on a stand-in process, which record each exit and each message.
function harness(onSignal, onExit) {
	const p = fakeProcess();
	const handlers = registerSignalHandlers({
		onSignal,
		onExit,
		proc: p.proc,
		exit: p.exit,
		write: p.write,
	});
	return { ...p, handlers };
}

describe('registerSignalHandlers', () => {
	it('exits 130 on SIGINT and 143 on SIGTERM when no run is alive', () => {
		const h = harness(() => false);
		h.proc.emit('SIGINT');
		h.proc.emit('SIGTERM');
		assert.deepEqual(h.exits, [130, 143]);
	});

	// A live Stryker gets the signal. The run ends once Stryker is gone.
	it('defers to a live run instead of exiting', () => {
		const seen = [];
		const h = harness((signal) => {
			seen.push(signal);
			return true;
		});
		h.proc.emit('SIGINT');
		h.proc.emit('SIGTERM');
		assert.deepEqual(seen, ['SIGINT', 'SIGTERM']);
		assert.deepEqual(h.exits, []);
	});

	it('exits 3 on an uncaught exception, never 1, and prints its stack', () => {
		const h = harness(() => false);
		h.proc.emit('uncaughtException', new Error('boom'));
		assert.deepEqual(h.exits, [3]);
		assert.match(h.writes.join(''), /mutate\.mjs crashed: Error: boom\n {4}at /);
	});

	it('prints a thrown value that is not an Error', () => {
		const h = harness(() => false);
		h.proc.emit('uncaughtException', 'plain text');
		assert.match(h.writes.join(''), /mutate\.mjs crashed: plain text\n$/);
	});

	it('still exits 3 when the thrown value is undefined', () => {
		const h = harness(() => false);
		h.proc.emit('uncaughtException', undefined);
		assert.deepEqual(h.exits, [3]);
		assert.match(h.writes.join(''), /mutate\.mjs crashed: undefined\n$/);
	});

	it('exits on a signal when no run registered a signal callback', () => {
		const h = harness(undefined);
		h.proc.emit('SIGINT');
		assert.deepEqual(h.exits, [130]);
	});
});

describe('registerSignalHandlers cleanup', () => {
	// An exit skips every `finally`, so the cleanup must run before it.
	it('runs onExit before each exit it makes', () => {
		const steps = [];
		const p = fakeProcess();
		registerSignalHandlers({
			onSignal: () => false,
			onExit: () => steps.push('cleanup'),
			proc: p.proc,
			exit: (code) => steps.push(`exit ${code}`),
			write: p.write,
		});
		p.proc.emit('SIGINT');
		p.proc.emit('SIGTERM');
		p.proc.emit('uncaughtException', new Error('boom'));
		assert.deepEqual(steps, ['cleanup', 'exit 130', 'cleanup', 'exit 143', 'cleanup', 'exit 3']);
	});

	it('runs onExit only when it exits, not when a live run takes the signal', () => {
		let cleanups = 0;
		const h = harness(
			() => true,
			() => cleanups++,
		);
		h.proc.emit('SIGINT');
		assert.equal(cleanups, 0);
		assert.deepEqual(h.exits, []);
	});

	// The exit code contract holds even when the cleanup fails.
	it('still exits with the same code when onExit throws, and prints why', () => {
		const h = harness(
			() => false,
			() => {
				throw new Error('EBUSY');
			},
		);
		h.proc.emit('SIGTERM');
		h.proc.emit('uncaughtException', new Error('boom'));
		assert.deepEqual(h.exits, [143, 3]);
		const printed = h.writes.join('');
		assert.equal(printed.match(/\n✗ Cleanup before exit failed: EBUSY\n/g).length, 2);
	});

	it('stops listening after dispose, so the next job owns its own handlers', () => {
		const h = harness(() => false);
		h.handlers.dispose();
		h.proc.emit('SIGINT');
		h.proc.emit('SIGTERM');
		h.proc.emit('uncaughtException', new Error('boom'));
		assert.deepEqual(h.exits, []);
		for (const event of ['SIGINT', 'SIGTERM', 'uncaughtException']) {
			assert.equal(h.proc.listenerCount(event), 0);
		}
	});
});

// A crash while Stryker runs waits for Stryker to stop before the cleanup.
describe('registerSignalHandlers with onCrash', () => {
	function crashHarness(onCrash) {
		const steps = [];
		const p = fakeProcess();
		registerSignalHandlers({
			onSignal: () => false,
			onCrash,
			onExit: () => steps.push('cleanup'),
			proc: p.proc,
			exit: (code) => {
				steps.push(`exit ${code}`);
				p.exit(code);
			},
			write: p.write,
		});
		return { ...p, steps };
	}

	it('runs the cleanup and exits 3 at once when onCrash has nothing to wait for', () => {
		const h = crashHarness(() => null);
		h.proc.emit('uncaughtException', new Error('boom'));
		assert.deepEqual(h.steps, ['cleanup', 'exit 3']);
	});

	it('runs the cleanup and exits 3 only after the promise of onCrash settles', async () => {
		let stopped;
		const h = crashHarness(
			() =>
				new Promise((resolve) => {
					stopped = resolve;
				}),
		);
		h.proc.emit('uncaughtException', new Error('boom'));
		await nextTurn();
		assert.deepEqual(h.steps, []);
		stopped();
		assert.equal(await h.exited, 3);
		assert.deepEqual(h.steps, ['cleanup', 'exit 3']);
	});

	it('still runs the cleanup and exits 3 when the promise of onCrash rejects', async () => {
		const h = crashHarness(() => Promise.reject(new Error('EPERM')));
		h.proc.emit('uncaughtException', new Error('boom'));
		assert.equal(await h.exited, 3);
		assert.deepEqual(h.steps, ['cleanup', 'exit 3']);
	});

	it('prints a second crash while it waits, but waits and exits only once', async () => {
		let stopped;
		let waits = 0;
		const h = crashHarness(() => {
			waits++;
			return new Promise((resolve) => {
				stopped = resolve;
			});
		});
		h.proc.emit('uncaughtException', new Error('first'));
		h.proc.emit('uncaughtException', new Error('second'));
		stopped();
		await h.exited;
		await nextTurn();
		assert.equal(waits, 1);
		assert.deepEqual(h.steps, ['cleanup', 'exit 3']);
		assert.match(h.writes.join(''), /crashed: Error: first\n[\s\S]*crashed: Error: second\n/);
	});
});

describe('guardOutsideStryker', () => {
	const events = ['SIGINT', 'SIGTERM', 'uncaughtException'];
	const counts = (p) => events.map((event) => p.proc.listenerCount(event));

	function guarded() {
		const p = fakeProcess();
		let cleanups = 0;
		const guard = guardOutsideStryker({
			onExit: () => cleanups++,
			proc: p.proc,
			exit: p.exit,
			write: p.write,
		});
		return { ...p, guard, cleanups: () => cleanups };
	}

	it('listens from the start, and runs the cleanup before it exits', () => {
		const h = guarded();
		assert.deepEqual(counts(h), [1, 1, 1]);
		h.proc.emit('SIGINT');
		assert.deepEqual(h.exits, [130]);
		assert.equal(h.cleanups(), 1);
	});

	it('stops listening on release and listens once more on hold', () => {
		const h = guarded();
		h.guard.release();
		assert.deepEqual(counts(h), [0, 0, 0]);
		h.proc.emit('SIGTERM');
		assert.deepEqual(h.exits, []);
		h.guard.hold();
		h.guard.hold();
		assert.deepEqual(counts(h), [1, 1, 1]);
		h.proc.emit('SIGTERM');
		assert.deepEqual(h.exits, [143]);
	});

	it('can release twice', () => {
		const h = guarded();
		h.guard.release();
		h.guard.release();
		assert.deepEqual(counts(h), [0, 0, 0]);
	});
});

// Without stand-ins the handlers end the real process and write to its stderr.
describe('registerSignalHandlers in a real process', () => {
	const strykerUrl = pathToFileURL(path.join(import.meta.dirname, 'stryker.mjs')).href;

	// Run `body` in a new node process after it registers the handlers.
	function runWithHandlers(body) {
		const script = [
			`import { registerSignalHandlers } from '${strykerUrl}';`,
			'registerSignalHandlers({ onSignal: () => false });',
			body,
			// Keep the process alive until a handler ends it.
			'setTimeout(() => {}, 10_000);',
		].join('\n');
		return spawnSync(process.execPath, ['--input-type=module', '--eval', script], {
			encoding: 'utf8',
			timeout: 20_000,
		});
	}

	it('exits 130 on SIGINT and 143 on SIGTERM', () => {
		assert.equal(runWithHandlers("process.kill(process.pid, 'SIGINT');").status, 130);
		assert.equal(runWithHandlers("process.kill(process.pid, 'SIGTERM');").status, 143);
	});

	it('exits 3 and prints the stack to stderr on an uncaught exception', () => {
		const res = runWithHandlers("setImmediate(() => { throw new Error('boom'); });");
		assert.equal(res.status, 3);
		assert.match(res.stderr, /mutate\.mjs crashed: Error: boom\n {4}at /);
	});
});
