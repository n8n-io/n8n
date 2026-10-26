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
});
