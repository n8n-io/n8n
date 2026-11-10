import { checkWorkload } from './invariants';
import { until } from './process';
import { RigStack, stopAllStacks } from './stack';
import { Workload } from './workload';

afterEach(async () => await stopAllStacks());

describe('workload', () => {
	it('records one effect per accepted request on a healthy stack', async () => {
		const rig = await RigStack.start({
			name: 'workload',
			workers: 2,
			runners: 'internal',
			scale: 1,
		});
		try {
			await rig.api.signIn();
			const workload = await Workload.setup(rig);
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
			const byRequest = await workload.executionsByRequest(requests.map((r) => r.requestId));
			expect(Object.values(byRequest).map((ids) => ids.length)).toEqual(requests.map(() => 1));
			expect(checkWorkload(record)).toEqual([]);
		} finally {
			await rig.stop();
		}
	});
});
