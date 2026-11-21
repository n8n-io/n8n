import { describe, expect, test, vi } from 'vitest';

import { ResourceTracker } from '../resource-tracker';

function container(id: string, stop = vi.fn().mockResolvedValue(undefined)) {
	return {
		getId: () => id,
		stop,
	};
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

		expect(cleanup.failures).toHaveLength(1);
		expect(cleanup.failures[0]?.resource).toBe('container stuck-container');
		expect(cleanup.failures[0]?.error.message).toBe('daemon refused to stop');
		expect(cleanup.remaining).toEqual(['container stuck-container']);
	});

	test('runs before-stop steps while containers still run, and ignores their failures', async () => {
		const order: string[] = [];
		const tracker = new ResourceTracker();
		tracker.trackContainer(
			container(
				'n8n',
				vi.fn(async () => {
					order.push('stop');
				}),
			) as never,
		);
		tracker.beforeStop(async () => {
			order.push('failing step');
			throw new Error('container already gone');
		});
		tracker.beforeStop(async () => {
			order.push('step');
		});

		await expect(tracker.dispose()).resolves.toEqual({ failures: [], remaining: [] });
		expect(order).toEqual(['failing step', 'step', 'stop']);
	});

	test.each([undefined, { timeout: 25 }])(
		'continues cleanup when a before-stop step stalls (options: %j)',
		async (options) => {
			const tracker = new ResourceTracker();
			const started = container('n8n');
			const step = vi.fn(async (_signal: AbortSignal) => await new Promise<void>(() => {}));
			tracker.trackContainer(started as never);
			tracker.beforeStop(step);

			vi.useFakeTimers();
			try {
				const cleanup = tracker.dispose(options);
				expect(started.stop).not.toHaveBeenCalled();
				if (options) {
					await vi.advanceTimersByTimeAsync(options.timeout - 1);
					expect(started.stop).not.toHaveBeenCalled();
					await vi.advanceTimersByTimeAsync(1);
				} else {
					await vi.runAllTimersAsync();
				}
				expect(started.stop).toHaveBeenCalledOnce();
				await expect(cleanup).resolves.toEqual({ failures: [], remaining: [] });
				expect(step.mock.calls[0][0].aborted).toBe(true);
			} finally {
				vi.useRealTimers();
			}
		},
	);
});
