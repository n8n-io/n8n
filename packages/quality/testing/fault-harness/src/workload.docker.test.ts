import { checkWorkload } from './invariants';
import { until } from './process';
import { HarnessStack, stopAllStacks } from './stack';
import { Workload } from './workload';

afterEach(async () => await stopAllStacks());

describe('workload', () => {
	it('records one effect per accepted request on a healthy stack', async () => {
		const harness = await HarnessStack.start({
			name: 'workload',
			workers: 2,
			runners: 'internal',
			scale: 1,
		});
		let started: Workload | undefined;
		try {
			await harness.api.signIn();
			const workload = await Workload.setup(harness);
			started = workload;
			workload.start(5);
			await until(
				'20 requests answered',
				async () => await Promise.resolve(workload.completed >= 20),
				30_000,
			);
			const requests = await workload.stop();
			const record = await workload.record(requests, 60_000);

			expect(requests.length).toBeGreaterThanOrEqual(20);
			expect(requests.every((r) => r.status === 200)).toBe(true);
			expect(record.effects).toHaveLength(requests.length);
			expect(
				requests.filter((r) => !r.executionId || !(r.executionId in record.executions)),
			).toEqual([]);
			expect(checkWorkload(record)).toEqual([]);
		} finally {
			await started?.stop();
			await harness.stop();
		}
	});
});
