import { PassThrough } from 'node:stream';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { pollHealthEndpoint } from '../helm-stack';
import { pollContainerHttpEndpoint, waitForContainerLogMessages } from '../helpers/utils';
import { StartupDeadline, StartupTimeoutError } from '../startup-deadline';

afterEach(() => {
	vi.restoreAllMocks();
});

describe('StartupDeadline', () => {
	test('rejects a hanging operation when the overall deadline expires', async () => {
		const deadline = new StartupDeadline(10);

		await expect(deadline.run(async () => await new Promise(() => {}))).rejects.toBeInstanceOf(
			StartupTimeoutError,
		);
		deadline.dispose();
	});

	test('cancels an operation before the timeout', async () => {
		const deadline = new StartupDeadline(1_000);
		const operation = vi.fn(
			async (signal: AbortSignal) =>
				await new Promise<void>((_, reject) => {
					signal.addEventListener(
						'abort',
						() => reject(signal.reason instanceof Error ? signal.reason : new Error('aborted')),
						{ once: true },
					);
				}),
		);

		const running = deadline.run(operation);
		deadline.abort(new Error('cancelled by test'));

		await expect(running).rejects.toThrow('cancelled by test');
		expect(operation).toHaveBeenCalledOnce();
		deadline.dispose();
	});

	test('forwards cancellation to HTTP readiness polling', async () => {
		const deadline = new StartupDeadline(1_000);
		const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
			return await new Promise<Response>((_, reject) => {
				init?.signal?.addEventListener(
					'abort',
					() =>
						reject(
							init.signal?.reason instanceof Error ? init.signal.reason : new Error('aborted'),
						),
					{ once: true },
				);
			});
		});
		vi.stubGlobal('fetch', fetchMock);

		const container = {
			getHost: () => 'localhost',
			getFirstMappedPort: () => 5678,
		};
		const polling = pollContainerHttpEndpoint(
			container as never,
			'/healthz/readiness',
			deadline.remainingMs,
			deadline.signal,
		);
		deadline.abort(new Error('cancelled by test'));

		await expect(polling).rejects.toThrow('cancelled by test');
		expect(fetchMock).toHaveBeenCalledOnce();
		deadline.dispose();
	});

	test('destroys a log stream that resolves after cancellation', async () => {
		const deadline = new StartupDeadline(1_000);
		const stream = new PassThrough();
		let resolveLogs!: (value: PassThrough) => void;
		const container = {
			getName: () => 'test-container',
			logs: async () => await new Promise<PassThrough>((resolve) => (resolveLogs = resolve)),
		};

		const waiting = waitForContainerLogMessages(container as never, [/ready/], {
			signal: deadline.signal,
		});
		deadline.abort(new Error('cancelled by test'));

		await expect(waiting).rejects.toThrow('cancelled by test');
		resolveLogs(stream);
		await new Promise((resolve) => setImmediate(resolve));
		expect(stream.destroyed).toBe(true);
		deadline.dispose();
	});

	test('forwards cancellation to Helm readiness polling', async () => {
		const deadline = new StartupDeadline(1_000);
		const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
			return await new Promise<Response>((_, reject) => {
				init?.signal?.addEventListener(
					'abort',
					() =>
						reject(
							init.signal?.reason instanceof Error ? init.signal.reason : new Error('aborted'),
						),
					{ once: true },
				);
			});
		});
		vi.stubGlobal('fetch', fetchMock);

		const polling = pollHealthEndpoint('http://localhost:5678', 1_000, deadline.signal);
		deadline.abort(new Error('cancelled by test'));

		await expect(polling).rejects.toThrow('cancelled by test');
		expect(fetchMock).toHaveBeenCalledOnce();
		deadline.dispose();
	});
});
