import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
	exitCodeForSignal,
	guardOutsideStryker,
	registerSignalHandlers,
	runStryker,
} from './stryker.mjs';
import { MutateError } from './targets.mjs';
import { fakeProcess, fakeSpawn, namesInPlaceMode, sink } from './test-doubles.mjs';

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

	// A live Stryker gets the signal and removes its sandbox before it exits.
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

// Start runStryker with a fake spawn and a stand-in process.
const argv = ['/bin/stryker.js', 'run', '/pkg/reports/mutation/stryker.run.json'];

function start(onSpawn, { onExit } = {}) {
	const doubles = fakeSpawn({ onSpawn });
	const p = fakeProcess();
	const out = sink();
	const err = sink();
	const io = {
		spawn: doubles.spawn,
		stdout: out,
		stderr: err,
		onExit,
		proc: p.proc,
		exit: p.exit,
		write: p.write,
	};
	return { ...doubles, ...p, out, err, promise: runStryker({ argv, cwd: '/pkg' }, io) };
}

describe('runStryker', () => {
	it('starts node on the Stryker binary in the package dir, with no in place flag', async () => {
		const run = start((child) => setImmediate(() => child.finish(0)));
		await run.promise;
		assert.equal(run.calls.length, 1);
		const [{ command, args, options }] = run.calls;
		assert.equal(command, process.execPath);
		assert.deepEqual(args, argv);
		assert.equal(options.cwd, '/pkg');
		// Stryker reads no input. Its output is kept for the classification.
		assert.deepEqual(options.stdio, ['inherit', 'pipe', 'pipe']);
		assert.equal(args.some(namesInPlaceMode), false);
	});

	// The command list is the whole set of processes a run starts: no git, so
	// nothing can check out files over the working tree.
	it('starts no process other than Stryker', async () => {
		const run = start((child) => setImmediate(() => child.finish(0)));
		await run.promise;
		assert.deepEqual(
			run.calls.map((call) => call.command),
			[process.execPath],
		);
	});

	it("streams Stryker's output through and keeps it for the caller", async () => {
		const run = start((child) =>
			setImmediate(() => {
				child.stdout.emit('data', Buffer.from('Instrumented 1 source file(s) with 3 mutant(s)\n'));
				child.stderr.emit('data', Buffer.from('ERROR something\n'));
				child.finish(1);
			}),
		);
		const result = await run.promise;
		assert.deepEqual(result, {
			exitCode: 1,
			output: 'Instrumented 1 source file(s) with 3 mutant(s)\nERROR something\n',
			cancelledBy: null,
		});
		assert.equal(run.out.text(), 'Instrumented 1 source file(s) with 3 mutant(s)\n');
		assert.equal(run.err.text(), 'ERROR something\n');
	});
});

describe('runStryker signals and start errors', () => {
	it('passes a SIGINT on to a live Stryker and reports the run as cancelled', async () => {
		const run = start();
		run.proc.emit('SIGINT');
		assert.deepEqual(run.children[0].kills, ['SIGINT']);
		assert.deepEqual(run.exits, []);
		run.children[0].finish(130);
		assert.equal((await run.promise).cancelledBy, 'SIGINT');
		// The run is over, so its handlers are gone.
		assert.equal(run.proc.listenerCount('SIGINT'), 0);
	});

	it('reports the exit code of Stryker, and 1 when a signal ended it', async () => {
		for (const [code, expected] of [
			[2, 2],
			[null, 1],
		]) {
			const run = start((child) => setImmediate(() => child.emit('close', code)));
			assert.equal((await run.promise).exitCode, expected);
		}
	});

	it('does not forward a signal to a Stryker that a signal already ended', async () => {
		const run = start();
		run.children[0].signalCode = 'SIGKILL';
		run.proc.emit('SIGINT');
		assert.deepEqual(run.exits, [130]);
		assert.deepEqual(run.children[0].kills, []);
		run.children[0].emit('close', null);
		await run.promise;
	});

	it('runs the cleanup, then exits at once, on a signal that comes after Stryker is gone', async () => {
		let cleanups = 0;
		const run = start(undefined, { onExit: () => cleanups++ });
		run.children[0].exitCode = 0;
		run.proc.emit('SIGTERM');
		assert.deepEqual(run.exits, [143]);
		assert.equal(cleanups, 1);
		assert.deepEqual(run.children[0].kills, []);
		run.children[0].emit('close', 0);
		await run.promise;
	});

	// The tool exits at once after a crash. A live Stryker must not outlive it.
	it('stops a live Stryker and runs the cleanup, then exits 3, on a crash', async () => {
		const steps = [];
		const run = start(undefined, { onExit: () => steps.push('cleanup') });
		run.children[0].kill = (signal) => steps.push(`kill ${signal}`);
		run.proc.emit('uncaughtException', new Error('boom'));
		assert.deepEqual(steps, ['kill SIGINT', 'cleanup']);
		assert.deepEqual(run.exits, [3]);
		run.children[0].finish(130);
		await run.promise;
	});

	it('does not stop a Stryker that is already gone on a crash', async () => {
		const run = start();
		run.children[0].exitCode = 1;
		run.proc.emit('uncaughtException', new Error('boom'));
		assert.deepEqual(run.children[0].kills, []);
		assert.deepEqual(run.exits, [3]);
		run.children[0].emit('close', 1);
		await run.promise;
	});

	it('fails with exit code 3 when Stryker cannot start', async () => {
		const run = start((child) => setImmediate(() => child.emit('error', new Error('ENOENT'))));
		await assert.rejects(run.promise, (error) => {
			assert.ok(error instanceof MutateError);
			assert.equal(error.exitCode, 3);
			assert.match(error.message, /Stryker failed to start: ENOENT/);
			return true;
		});
		assert.equal(run.proc.listenerCount('SIGINT'), 0);
	});
});
