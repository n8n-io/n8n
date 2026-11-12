import { runSchedule } from './execute';
import type { Fault } from './schedule';

const timerClock = () => {
	let now = 0;
	const timers: Array<{ at: number; resolve: () => void }> = [];
	const settle = async () => await new Promise((resolve) => setImmediate(resolve));
	return {
		now: () => now,
		sleep: async (ms: number) =>
			await new Promise<void>((resolve) => timers.push({ at: now + ms, resolve })),
		async drive<T>(work: Promise<T>): Promise<T> {
			let done = false;
			const finished = work.finally(() => {
				done = true;
			});
			await settle();
			while (!done) {
				timers.sort((a, b) => a.at - b.at);
				const next = timers.shift();
				if (!next) throw new Error('no timer left and the work has not finished');
				now = next.at;
				next.resolve();
				await settle();
			}
			return await finished;
		},
	};
};

describe('runSchedule', () => {
	it('starts overlapping faults at their own times and records when each ended', async () => {
		const clock = timerClock();
		const started: Array<[number, string]> = [];
		const applied = await clock.drive(
			runSchedule(
				[
					{ atMs: 500, fault: { kind: 'kill', target: 'worker-2' } },
					{ atMs: 100, fault: { kind: 'freeze', target: 'worker-1', forMs: 1000 } },
				],
				async (fault: Fault) => {
					started.push([clock.now(), fault.target]);
					if ('forMs' in fault) await clock.sleep(fault.forMs);
				},
				clock,
			),
		);
		expect(started).toEqual([
			[100, 'worker-1'],
			[500, 'worker-2'],
		]);
		expect(applied.map((a) => [a.atMs, a.startedMs, a.endedMs])).toEqual([
			[100, 100, 1100],
			[500, 500, 500],
		]);
	});

	it('starts a fault on a busy target once the fault before it on that target ends', async () => {
		const clock = timerClock();
		const applied = await clock.drive(
			runSchedule(
				[
					{ atMs: 0, fault: { kind: 'kill', target: 'worker-1' } },
					{ atMs: 100, fault: { kind: 'cut', target: 'worker-1', to: 'redis', forMs: 50 } },
					{ atMs: 100, fault: { kind: 'freeze', target: 'worker-2', forMs: 50 } },
				],
				async (fault: Fault) => {
					await clock.sleep('forMs' in fault ? fault.forMs : 300);
				},
				clock,
			),
		);
		expect(applied.map((a) => [a.fault.target, a.startedMs, a.endedMs])).toEqual([
			['worker-1', 0, 300],
			['worker-1', 300, 350],
			['worker-2', 100, 150],
		]);
	});

	it('records whether a fault was hit', async () => {
		const clock = timerClock();
		const applied = await clock.drive(
			runSchedule(
				[
					{ atMs: 0, fault: { kind: 'kill', target: 'worker-1' } },
					{
						atMs: 10,
						fault: { kind: 'hook', target: 'worker-2', point: 'p', forMs: 5 },
					},
				],
				async (fault: Fault) =>
					await Promise.resolve(fault.kind === 'hook' ? { hit: false } : undefined),
				clock,
			),
		);
		expect(applied.map((a) => a.hit)).toEqual([undefined, false]);
	});
});
