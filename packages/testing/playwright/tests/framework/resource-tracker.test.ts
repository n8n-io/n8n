import { describe, expect, test, vi } from 'vitest';

import { ResourceTracker } from '../../../containers/resource-tracker';

function container(id: string, stop = vi.fn().mockResolvedValue(undefined)) {
	const resource = {
		getId: () => id,
		stop,
	};
	return resource;
}

describe('ResourceTracker', () => {
	test('waits for a late acquisition before cleanup', async () => {
		const tracker = new ResourceTracker();
		const endAcquisition = tracker.beginAcquisition();
		const lateContainer = container('late-container');
		const cleanup = tracker.dispose();

		tracker.trackContainer(lateContainer as never);
		endAcquisition();

		await expect(cleanup).resolves.toEqual({ failures: [], remaining: [] });
		await expect(tracker.dispose()).resolves.toEqual({ failures: [], remaining: [] });
		expect(lateContainer.stop).toHaveBeenCalledTimes(1);
	});

	test('reports cleanup failures and keeps the original resource', async () => {
		const stop = vi.fn().mockRejectedValue(new Error('daemon refused to stop'));
		const tracker = new ResourceTracker();
		tracker.trackContainer(container('stuck-container', stop) as never);

		const cleanup = await tracker.dispose();

		expect(cleanup.failures).toEqual([
			expect.objectContaining({
				resource: 'container stuck-container',
				error: expect.objectContaining({ message: 'daemon refused to stop' }),
			}),
		]);
		expect(cleanup.remaining).toEqual(['container stuck-container']);
	});
});
