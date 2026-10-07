import { runSchedule } from './execute';
import type { Fault } from './schedule';

const fakeClock = () => {
	let now = 0;
	return {
		now: () => now,
		sleep: async (ms: number) => {
			now += ms;
			await Promise.resolve();
		},
	};
};

describe('runSchedule', () => {
	it('starts each fault at its time and records when it ended', async () => {
		const clock = fakeClock();
		const started: Array<[number, string]> = [];
		const applied = await runSchedule(
			[
				{ atMs: 500, fault: { kind: 'kill', target: 'worker-2' } },
				{ atMs: 100, fault: { kind: 'freeze', target: 'worker-1', forMs: 1000 } },
			],
			async (fault: Fault) => {
				started.push([clock.now(), fault.target]);
				if ('forMs' in fault) await clock.sleep(fault.forMs);
			},
			clock,
		);
		expect(started).toEqual([
			[100, 'worker-1'],
			[1100, 'worker-2'],
		]);
		expect(applied.map((a) => [a.atMs, a.startedMs, a.endedMs])).toEqual([
			[100, 100, 1100],
			[500, 1100, 1100],
		]);
	});

	it('records a failed fault and goes on', async () => {
		const applied = await runSchedule(
			[
				{ atMs: 0, fault: { kind: 'kill', target: 'gone' } },
				{ atMs: 10, fault: { kind: 'kill', target: 'worker-1' } },
			],
			async (fault: Fault) => {
				if (fault.target === 'gone') throw new Error('no container gone');
				await Promise.resolve();
			},
			fakeClock(),
		);
		expect(applied.map((a) => a.error)).toEqual(['no container gone', undefined]);
	});
});
