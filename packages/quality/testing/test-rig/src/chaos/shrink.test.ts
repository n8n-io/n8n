import type { ScheduledFault } from './schedule';
import { shrink } from './shrink';

const fault = (atMs: number): ScheduledFault => ({
	atMs,
	fault: { kind: 'kill', target: `worker-${atMs}` },
});
const schedule = [1, 2, 3, 4, 5, 6].map(fault);
const has = (candidate: ScheduledFault[], ...ats: number[]) =>
	ats.every((at) => candidate.some((entry) => entry.atMs === at));
const options = { repeats: 1, minFailures: 1, maxRuns: 1000, budgetMs: 60_000 };

describe('shrink', () => {
	it('finds the smallest schedule that still fails', async () => {
		const result = await shrink(
			schedule,
			async (c) => await Promise.resolve(has(c, 2, 5)),
			options,
		);
		expect(result.schedule.map((s) => s.atMs)).toEqual([2, 5]);
		expect(result.exhausted).toBe(false);
	});

	it('keeps a fault a flaky failure only sometimes needs, unless it fails often enough', async () => {
		let call = 0;
		const flaky = async (c: ScheduledFault[]) =>
			await Promise.resolve(has(c, 3) && (has(c, 4) || ++call % 3 === 0));
		const strict = await shrink(schedule, flaky, { ...options, repeats: 3, minFailures: 3 });
		expect(strict.schedule.map((s) => s.atMs)).toEqual([3, 4]);
	});

	it('stops at the run limit and says so', async () => {
		const result = await shrink(schedule, async () => await Promise.resolve(false), {
			...options,
			maxRuns: 2,
		});
		expect(result).toMatchObject({ schedule, runs: 2, exhausted: true });
	});

	it('stops at the time budget', async () => {
		let now = 0;
		const result = await shrink(
			schedule,
			async () => {
				now += 10;
				return await Promise.resolve(false);
			},
			{ ...options, budgetMs: 25, now: () => now },
		);
		expect(result.exhausted).toBe(true);
		expect(result.runs).toBe(3);
	});

	it('stops repeating a candidate once it can no longer reach the failure count', async () => {
		let runs = 0;
		await shrink(
			[fault(1), fault(2)],
			async () => {
				runs += 1;
				return await Promise.resolve(false);
			},
			{ ...options, repeats: 5, minFailures: 4 },
		);
		expect(runs).toBe(4);
	});
});
