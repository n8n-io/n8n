import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { runStryker } from './stryker.mjs';
import { MutateError } from './targets.mjs';
import { fakeProcess, fakeSpawn, namesInPlaceMode, settledState, sink } from './test-doubles.mjs';

const nextTurn = () => new Promise((resolve) => setImmediate(resolve));

// Start runStryker with a fake spawn and a stand-in process.
const argv = ['/bin/stryker.js', 'run', '/pkg/reports/mutation/stryker.run.json'];

function start(onSpawn, { onExit, crashStopGraceMs } = {}) {
	const doubles = fakeSpawn({ onSpawn });
	const p = fakeProcess();
	const out = sink();
	const err = sink();
	const io = {
		spawn: doubles.spawn,
		stdout: out,
		stderr: err,
		onExit,
		crashStopGraceMs,
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

// The run does not go on after a crash, and the cleanup must not remove the
// mirror while Stryker still works in it.
describe('runStryker on a crash', () => {
	it('stops a live Stryker on a crash, then runs the cleanup and exits 3 once it is gone', async () => {
		const steps = [];
		const run = start(undefined, { onExit: () => steps.push('cleanup') });
		run.children[0].kill = (signal) => steps.push(`kill ${signal}`);
		run.proc.emit('uncaughtException', new Error('boom'));
		await nextTurn();
		assert.deepEqual(steps, ['kill SIGINT']);
		assert.deepEqual(run.exits, []);
		assert.match(
			run.writes.join(''),
			/\nWaiting up to 10 s for Stryker to stop before the cleanup\.\n$/,
		);
		run.children[0].finish(130);
		assert.equal(await run.exited, 3);
		assert.deepEqual(steps, ['kill SIGINT', 'cleanup']);
		assert.equal(await settledState(run.promise), 'pending');
	});

	// A second SIGINT makes Stryker exit at once.
	it('stops Stryker again, then runs the cleanup and exits 3, when it is not gone in time', async () => {
		const steps = [];
		const run = start(undefined, { onExit: () => steps.push('cleanup'), crashStopGraceMs: 5 });
		run.children[0].kill = (signal) => steps.push(`kill ${signal}`);
		run.proc.emit('uncaughtException', new Error('boom'));
		assert.equal(await run.exited, 3);
		assert.deepEqual(steps, ['kill SIGINT', 'kill SIGINT', 'cleanup']);
	});

	it('passes a signal during the wait on to Stryker, and exits 3 once Stryker is gone', async () => {
		const run = start();
		run.proc.emit('uncaughtException', new Error('boom'));
		run.proc.emit('SIGINT');
		assert.deepEqual(run.children[0].kills, ['SIGINT', 'SIGINT']);
		assert.deepEqual(run.exits, []);
		run.children[0].finish(130);
		assert.equal(await run.exited, 3);
		assert.deepEqual(run.exits, [3]);
	});

	it('does not stop a Stryker that is already gone on a crash, and exits 3 at once', async () => {
		const run = start();
		run.children[0].exitCode = 1;
		run.proc.emit('uncaughtException', new Error('boom'));
		assert.deepEqual(run.children[0].kills, []);
		assert.deepEqual(run.exits, [3]);
		run.children[0].emit('close', 1);
		assert.equal(await settledState(run.promise), 'pending');
	});
});
