import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { sleep } from '@n8n/utils/sleep';
import type { INode, INodeExecutionData, IRun, Logger } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import {
	createDataEmitter,
	type DataEmitterContext,
	type DataEmitterOptions,
} from '../../../v2/consumer/DataEmitter';

vi.mock('@n8n/utils/sleep', () => ({ sleep: vi.fn(async () => {}) }));

const ITEMS: INodeExecutionData[] = [{ json: { message: 'hello' } }];

const mockedSleep = vi.mocked(sleep);

const run = (status: string) => mock<IRun>({ status: status as IRun['status'] });

let ctx: DataEmitterContext;
let emitSpy: ReturnType<typeof vi.fn>;
let logger: Logger;

beforeEach(() => {
	mockedSleep.mockClear();
	emitSpy = vi.fn();
	logger = mock<Logger>();
	ctx = {
		emit: emitSpy as unknown as DataEmitterContext['emit'],
		logger,
		getNode: () => mock<INode>({ name: 'Kafka Trigger' }),
		helpers: { createDeferredPromise },
	};
});

const build = (options: DataEmitterOptions, signal = new AbortController().signal) =>
	createDataEmitter(ctx, options, signal);

/** Runs the emitter and settles the execution it started with the given status. */
const emitAndFinish = async (options: DataEmitterOptions, status: string) => {
	const emitter = build(options);
	const pending = emitter(ITEMS);
	await vi.waitFor(() => expect(emitSpy).toHaveBeenCalled());
	const deferred = emitSpy.mock.calls[0][2] as { resolve: (value: IRun) => void };
	deferred.resolve(run(status));
	return await pending;
};

describe('createDataEmitter', () => {
	describe('immediately', () => {
		it('emits without waiting for the execution', async () => {
			const result = await build({ resolveOffsetMode: 'immediately' })(ITEMS);

			expect(result).toStrictEqual({ mayAdvance: true });
			expect(emitSpy).toHaveBeenCalledWith([ITEMS]);
			// No deferred promise: nothing is waiting on the run.
			expect(emitSpy.mock.calls[0]).toHaveLength(1);
		});

		it('refuses to start an execution once closing', async () => {
			const controller = new AbortController();
			controller.abort();

			const result = await build({ resolveOffsetMode: 'immediately' }, controller.signal)(ITEMS);

			expect(result).toStrictEqual({ mayAdvance: false });
			expect(emitSpy).not.toHaveBeenCalled();
		});
	});

	describe('onCompletion', () => {
		it.each(['success', 'error', 'crashed'])('allows the offset after a %s run', async (status) => {
			expect(await emitAndFinish({ resolveOffsetMode: 'onCompletion' }, status)).toStrictEqual({
				mayAdvance: true,
			});
		});
	});

	describe('onSuccess', () => {
		it('allows the offset only after a successful run', async () => {
			expect(await emitAndFinish({ resolveOffsetMode: 'onSuccess' }, 'success')).toStrictEqual({
				mayAdvance: true,
			});
		});

		it.each(['error', 'crashed', 'canceled'])('refuses after a %s run', async (status) => {
			expect(await emitAndFinish({ resolveOffsetMode: 'onSuccess' }, status)).toStrictEqual({
				mayAdvance: false,
			});
		});
	});

	describe('onStatus', () => {
		const options: DataEmitterOptions = {
			resolveOffsetMode: 'onStatus',
			allowedStatuses: ['success', 'canceled'],
		};

		it.each(['success', 'canceled'])(
			'allows the offset after an allowed %s run',
			async (status) => {
				expect(await emitAndFinish(options, status)).toStrictEqual({ mayAdvance: true });
			},
		);

		it('refuses after a status outside the list', async () => {
			expect(await emitAndFinish(options, 'error')).toStrictEqual({ mayAdvance: false });
		});

		it.each([undefined, []])('fails fast when the status list is %s', (allowedStatuses) => {
			expect(() => build({ resolveOffsetMode: 'onStatus', allowedStatuses })).toThrow(
				NodeOperationError,
			);
		});
	});

	describe('waiting', () => {
		it('gives up when the execution outlives the workflow timeout', async () => {
			vi.useFakeTimers();
			try {
				const emitter = build({ resolveOffsetMode: 'onCompletion', executionTimeoutSeconds: 10 });
				const pending = emitter(ITEMS);

				await vi.advanceTimersByTimeAsync(10_000);

				expect(await pending).toStrictEqual({ mayAdvance: false });
				expect(logger.error).toHaveBeenCalledWith(
					expect.stringContaining('longer than the configured workflow timeout of 10 seconds'),
					expect.anything(),
				);
			} finally {
				vi.useRealTimers();
			}
		});

		it.each([-1, 0])(
			'never times out when the workflow timeout is %s, meaning unbounded',
			async (executionTimeoutSeconds) => {
				vi.useFakeTimers();
				try {
					const emitter = build({ resolveOffsetMode: 'onCompletion', executionTimeoutSeconds });
					const pending = emitter(ITEMS);
					await vi.waitFor(() => expect(emitSpy).toHaveBeenCalled());

					// A negative delay handed to setTimeout would fire on the next tick.
					await vi.advanceTimersByTimeAsync(60_000);
					let settled = false;
					void pending.then(() => (settled = true));
					await vi.advanceTimersByTimeAsync(0);
					expect(settled).toBe(false);

					const deferred = emitSpy.mock.calls[0][2] as { resolve: (value: IRun) => void };
					deferred.resolve(run('success'));
					expect(await pending).toStrictEqual({ mayAdvance: true });
				} finally {
					vi.useRealTimers();
				}
			},
		);

		it('never times out when the deadline is too large for a timer', async () => {
			vi.useFakeTimers();
			try {
				// 25 days in seconds, past setTimeout's 32-bit limit once in ms. Handing
				// that over would fire after 1ms and fail every single hand-off.
				const emitter = build({
					resolveOffsetMode: 'onCompletion',
					executionTimeoutSeconds: 2_160_000,
				});
				const pending = emitter(ITEMS);
				await vi.waitFor(() => expect(emitSpy).toHaveBeenCalled());

				let settled = false;
				void pending.then(() => (settled = true));
				await vi.advanceTimersByTimeAsync(60_000);
				expect(settled).toBe(false);

				const deferred = emitSpy.mock.calls[0][2] as { resolve: (value: IRun) => void };
				deferred.resolve(run('success'));
				expect(await pending).toStrictEqual({ mayAdvance: true });
			} finally {
				vi.useRealTimers();
			}
		});

		it('logs a close-cancelled execution as debug, not error', async () => {
			const controller = new AbortController();
			const emitter = build({ resolveOffsetMode: 'onCompletion' }, controller.signal);

			const pending = emitter(ITEMS);
			await vi.waitFor(() => expect(emitSpy).toHaveBeenCalled());
			controller.abort();
			await pending;

			expect(logger.error).not.toHaveBeenCalled();
			expect(logger.debug).toHaveBeenCalled();
		});

		it('stops waiting when the trigger closes', async () => {
			const controller = new AbortController();
			const emitter = build({ resolveOffsetMode: 'onCompletion' }, controller.signal);

			const pending = emitter(ITEMS);
			await vi.waitFor(() => expect(emitSpy).toHaveBeenCalled());
			controller.abort();

			expect(await pending).toStrictEqual({ mayAdvance: false });
		});
	});

	describe('retry delay', () => {
		it('paces a failed hand-off by the configured delay', async () => {
			await emitAndFinish({ resolveOffsetMode: 'onSuccess', errorRetryDelay: 10_000 }, 'error');

			expect(mockedSleep).toHaveBeenCalledWith(10_000);
		});

		it('waits not at all when the delay is zero', async () => {
			await emitAndFinish({ resolveOffsetMode: 'onSuccess', errorRetryDelay: 0 }, 'error');

			expect(mockedSleep).toHaveBeenCalledWith(0);
		});

		// setTimeout turns each of these into no wait at all, so without a guard the
		// pacing quietly disappears and the failed chunk is re-read as fast as the
		// broker allows.
		it.each([undefined, NaN, -1, Infinity, 2_147_483_648])(
			'falls back to the default delay when the delay is %s',
			async (errorRetryDelay) => {
				await emitAndFinish({ resolveOffsetMode: 'onSuccess', errorRetryDelay }, 'error');

				expect(mockedSleep).toHaveBeenCalledWith(5000);
			},
		);

		it('warns that an unusable delay was replaced', async () => {
			await emitAndFinish({ resolveOffsetMode: 'onSuccess', errorRetryDelay: NaN }, 'error');

			expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Retry Delay on Error'));
		});
	});
});
