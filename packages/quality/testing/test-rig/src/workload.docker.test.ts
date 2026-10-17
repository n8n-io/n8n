import { checkWorkload } from './invariants';
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
			await new Promise((resolve) => setTimeout(resolve, 5_000));
			const requests = await workload.stop();
			const record = await workload.record(requests, 60_000);

			expect(requests.length).toBeGreaterThanOrEqual(20);
			expect(requests.every((r) => r.status === 200)).toBe(true);
			expect(record.effects).toHaveLength(requests.length);
			expect(checkWorkload(record)).toEqual([]);
		} finally {
			await rig.stop();
		}
	});
});
