import { mock } from 'jest-mock-extended';
import type { ITriggerFunctions, IRun, INode, Logger, IDeferredPromise } from 'n8n-workflow';
import { NodeOperationError, sleep } from 'n8n-workflow';

import { getAutoCommitSettings, configureDataEmitter, type KafkaTriggerOptions } from '../utils';

jest.mock('n8n-workflow', () => {
	const actual = jest.requireActual('n8n-workflow');
	return {
		...actual,
		sleep: jest.fn().mockResolvedValue(undefined),
	};
});

const mockedSleep = jest.mocked(sleep);

describe('Kafka Utils', () => {
	describe('getAutoCommitSettings', () => {
		it('should return autoCommit true and eachBatchAutoResolve false for version 1.1', () => {
			const options: KafkaTriggerOptions = {};
			const result = getAutoCommitSettings(options);

			expect(result).toEqual({
				autoCommit: true,
				eachBatchAutoResolve: false,
				autoCommitInterval: undefined,
				autoCommitThreshold: undefined,
			});
		});

		it('should return eachBatchAutoResolve true when option is set', () => {
			const options: KafkaTriggerOptions = {
				eachBatchAutoResolve: true,
			};
			const result = getAutoCommitSettings(options);

			expect(result).toEqual({
				autoCommit: true,
				eachBatchAutoResolve: true,
				autoCommitInterval: undefined,
				autoCommitThreshold: undefined,
			});
		});

		it('should return eachBatchAutoResolve false when option is explicitly false', () => {
			const options: KafkaTriggerOptions = {
				eachBatchAutoResolve: false,
			};
			const result = getAutoCommitSettings(options);

			expect(result).toEqual({
				autoCommit: true,
				eachBatchAutoResolve: false,
				autoCommitInterval: undefined,
				autoCommitThreshold: undefined,
			});
		});

		it('should pass through autoCommitInterval when provided', () => {
			const options: KafkaTriggerOptions = {
				autoCommitInterval: 5000,
			};
			const result = getAutoCommitSettings(options);

			expect(result).toEqual({
				autoCommit: true,
				eachBatchAutoResolve: false,
				autoCommitInterval: 5000,
				autoCommitThreshold: undefined,
			});
		});

		it('should pass through autoCommitThreshold when provided', () => {
			const options: KafkaTriggerOptions = {
				autoCommitThreshold: 100,
			};
			const result = getAutoCommitSettings(options);

			expect(result).toEqual({
				autoCommit: true,
				eachBatchAutoResolve: false,
				autoCommitInterval: undefined,
				autoCommitThreshold: 100,
			});
		});

		it('should pass through both autoCommit options when provided', () => {
			const options: KafkaTriggerOptions = {
				autoCommitInterval: 5000,
				autoCommitThreshold: 100,
			};
			const result = getAutoCommitSettings(options);

			expect(result).toEqual({
				autoCommit: true,
				eachBatchAutoResolve: false,
				autoCommitInterval: 5000,
				autoCommitThreshold: 100,
			});
		});

		it('should combine eachBatchAutoResolve with autoCommit options', () => {
			const options: KafkaTriggerOptions = {
				eachBatchAutoResolve: true,
				autoCommitInterval: 5000,
				autoCommitThreshold: 100,
			};
			const result = getAutoCommitSettings(options);

			expect(result).toEqual({
				autoCommit: true,
				eachBatchAutoResolve: true,
				autoCommitInterval: 5000,
				autoCommitThreshold: 100,
			});
		});
	});

	describe('configureDataEmitter', () => {
		const mockNode: INode = {
			id: 'test-node-id',
			name: 'Test Kafka Trigger',
			type: 'n8n-nodes-base.kafkaTrigger',
			typeVersion: 1.3,
			position: [0, 0],
			parameters: {},
		};

		interface TestDeferredPromise<T> extends IDeferredPromise<T> {
			resolveWith: (value: T) => void;
			rejectWith: (error: Error) => void;
		}

		const createDeferredPromise = <T>(): TestDeferredPromise<T> => {
			let resolveFunc: (value: T) => void;
			let rejectFunc: (error: Error) => void;
			const promise = new Promise<T>((res, rej) => {
				resolveFunc = res;
				rejectFunc = rej;
			});
			return {
				promise,
				resolve: () => {},
				reject: () => {},
				resolveWith: (value: T) => resolveFunc(value),
				rejectWith: (error: Error) => rejectFunc(error),
			};
		};

		const createMockContext = (
			params: Record<string, unknown> = {},
			mode: 'manual' | 'trigger' = 'trigger',
			deferredPromise?: TestDeferredPromise<IRun>,
		) => {
			const ctx = mock<ITriggerFunctions>();
			const mockLogger = mock<Logger>();

			ctx.getNodeParameter.mockImplementation(
				(name: string, fallback?: unknown) => (params[name] ?? fallback) as never,
			);
			ctx.getMode.mockReturnValue(mode);
			ctx.getNode.mockReturnValue(mockNode);
			ctx.logger = mockLogger;
			ctx.getWorkflowSettings.mockReturnValue({ executionTimeout: 3600 });

			// Mock helpers.createDeferredPromise
			if (deferredPromise) {
				ctx.helpers = {
					...ctx.helpers,
					createDeferredPromise: jest.fn().mockReturnValue(deferredPromise),
				} as unknown as ITriggerFunctions['helpers'];
			}

			return ctx;
		};

		beforeEach(() => {
			jest.clearAllMocks();
			jest.useFakeTimers();
		});

		afterEach(() => {
			jest.useRealTimers();
		});

		describe('immediate emit mode', () => {
			it('should emit immediately in manual mode regardless of resolveOffset setting', async () => {
				const ctx = createMockContext({ resolveOffset: 'onCompletion' }, 'manual');
				const options: KafkaTriggerOptions = {};

				const emitter = configureDataEmitter(ctx, options, 1.3);
				const testData = [{ json: { message: 'test' } }];

				const result = await emitter(testData);

				expect(ctx.emit).toHaveBeenCalledWith([testData]);
				expect(result).toEqual({ success: true });
			});

			it('should emit immediately for version 1 (resolveOffset mode is "immediately")', async () => {
				const ctx = createMockContext({}, 'trigger');
				const options: KafkaTriggerOptions = {};

				const emitter = configureDataEmitter(ctx, options, 1);
				const testData = [{ json: { message: 'test' } }];

				const result = await emitter(testData);

				expect(ctx.emit).toHaveBeenCalledWith([testData]);
				expect(result).toEqual({ success: true });
			});

			it('should emit immediately for version 1.1 with parallelProcessing enabled', async () => {
				const ctx = createMockContext({}, 'trigger');
				const options: KafkaTriggerOptions = { parallelProcessing: true };

				const emitter = configureDataEmitter(ctx, options, 1.1);
				const testData = [{ json: { message: 'test' } }];

				const result = await emitter(testData);

				expect(ctx.emit).toHaveBeenCalledWith([testData]);
				expect(result).toEqual({ success: true });
			});

			it('should emit immediately when resolveOffset is explicitly set to "immediately"', async () => {
				const ctx = createMockContext({ resolveOffset: 'immediately' }, 'trigger');
				const options: KafkaTriggerOptions = {};

				const emitter = configureDataEmitter(ctx, options, 1.3);
				const testData = [{ json: { message: 'test' } }];

				const result = await emitter(testData);

				expect(ctx.emit).toHaveBeenCalledWith([testData]);
				expect(result).toEqual({ success: true });
			});
		});

		describe('deferred emit mode - onCompletion', () => {
			it('should wait for execution completion and return success', async () => {
				const deferredPromise = createDeferredPromise<IRun>();
				const ctx = createMockContext(
					{ resolveOffset: 'onCompletion' },
					'trigger',
					deferredPromise,
				);
				const options: KafkaTriggerOptions = {};

				const emitter = configureDataEmitter(ctx, options, 1.3);
				const testData = [{ json: { message: 'test' } }];

				const resultPromise = emitter(testData);

				// Simulate successful execution completion
				deferredPromise.resolveWith({ status: 'success' } as unknown as IRun);

				const result = await resultPromise;

				expect(ctx.emit).toHaveBeenCalledWith([testData], undefined, deferredPromise);
				expect(result).toEqual({ success: true });
			});

			it('should return success for any status in onCompletion mode', async () => {
				const deferredPromise = createDeferredPromise<IRun>();
				const ctx = createMockContext(
					{ resolveOffset: 'onCompletion' },
					'trigger',
					deferredPromise,
				);
				const options: KafkaTriggerOptions = {};

				const emitter = configureDataEmitter(ctx, options, 1.3);
				const testData = [{ json: { message: 'test' } }];

				const resultPromise = emitter(testData);

				// Simulate failed execution - should still succeed in onCompletion mode
				deferredPromise.resolveWith({ status: 'error' } as unknown as IRun);

				const result = await resultPromise;

				expect(result).toEqual({ success: true });
			});

			it('should use version 1.1 onCompletion mode when parallelProcessing is false', async () => {
				const deferredPromise = createDeferredPromise<IRun>();
				const ctx = createMockContext({}, 'trigger', deferredPromise);
				const options: KafkaTriggerOptions = { parallelProcessing: false };

				const emitter = configureDataEmitter(ctx, options, 1.1);
				const testData = [{ json: { message: 'test' } }];

				const resultPromise = emitter(testData);

				deferredPromise.resolveWith({ status: 'success' } as unknown as IRun);

				const result = await resultPromise;

				expect(ctx.emit).toHaveBeenCalledWith([testData], undefined, deferredPromise);
				expect(result).toEqual({ success: true });
			});
		});

		describe('deferred emit mode - onSuccess', () => {
			it('should return success when execution status is "success"', async () => {
				const deferredPromise = createDeferredPromise<IRun>();
				const ctx = createMockContext({ resolveOffset: 'onSuccess' }, 'trigger', deferredPromise);
				const options: KafkaTriggerOptions = {};

				const emitter = configureDataEmitter(ctx, options, 1.3);
				const testData = [{ json: { message: 'test' } }];

				const resultPromise = emitter(testData);

				deferredPromise.resolveWith({ status: 'success' } as unknown as IRun);

				const result = await resultPromise;

				expect(result).toEqual({ success: true });
			});

			it('should return failure and sleep when execution status is not "success"', async () => {
				const deferredPromise = createDeferredPromise<IRun>();
				const ctx = createMockContext({ resolveOffset: 'onSuccess' }, 'trigger', deferredPromise);
				const options: KafkaTriggerOptions = {};

				const emitter = configureDataEmitter(ctx, options, 1.3);
				const testData = [{ json: { message: 'test' } }];

				const resultPromise = emitter(testData);

				deferredPromise.resolveWith({ status: 'error' } as unknown as IRun);

				const result = await resultPromise;

				expect(mockedSleep).toHaveBeenCalledWith(5000); // DEFAULT_ERROR_RETRY_DELAY_MS
				expect(ctx.logger.error).toHaveBeenCalled();
				expect(result).toEqual({ success: false });
			});

			it('should use custom errorRetryDelay when provided', async () => {
				const deferredPromise = createDeferredPromise<IRun>();
				const ctx = createMockContext({ resolveOffset: 'onSuccess' }, 'trigger', deferredPromise);
				const options: KafkaTriggerOptions = { errorRetryDelay: 10000 };

				const emitter = configureDataEmitter(ctx, options, 1.3);
				const testData = [{ json: { message: 'test' } }];

				const resultPromise = emitter(testData);

				deferredPromise.resolveWith({ status: 'error' } as unknown as IRun);

				await resultPromise;

				expect(mockedSleep).toHaveBeenCalledWith(10000);
			});
		});

		describe('deferred emit mode - onStatus', () => {
			it('should throw error when no statuses are selected', () => {
				const ctx = createMockContext(
					{ resolveOffset: 'onStatus', allowedStatuses: [] },
					'trigger',
				);
				const options: KafkaTriggerOptions = {};

				expect(() => configureDataEmitter(ctx, options, 1.3)).toThrow(NodeOperationError);
			});

			it('should return success when execution status matches allowed statuses', async () => {
				const deferredPromise = createDeferredPromise<IRun>();
				const ctx = createMockContext(
					{ resolveOffset: 'onStatus', allowedStatuses: ['success', 'warning'] },
					'trigger',
					deferredPromise,
				);
				const options: KafkaTriggerOptions = {};

				const emitter = configureDataEmitter(ctx, options, 1.3);
				const testData = [{ json: { message: 'test' } }];

				const resultPromise = emitter(testData);

				deferredPromise.resolveWith({ status: 'warning' } as unknown as IRun);

				const result = await resultPromise;

				expect(result).toEqual({ success: true });
			});

			it('should return failure when execution status does not match allowed statuses', async () => {
				const deferredPromise = createDeferredPromise<IRun>();
				const ctx = createMockContext(
					{ resolveOffset: 'onStatus', allowedStatuses: ['success'] },
					'trigger',
					deferredPromise,
				);
				const options: KafkaTriggerOptions = {};

				const emitter = configureDataEmitter(ctx, options, 1.3);
				const testData = [{ json: { message: 'test' } }];

				const resultPromise = emitter(testData);

				deferredPromise.resolveWith({ status: 'error' } as unknown as IRun);

				const result = await resultPromise;

				expect(mockedSleep).toHaveBeenCalled();
				expect(result).toEqual({ success: false });
			});
		});

		describe('timeout handling', () => {
			it('should timeout and return failure when execution takes too long', async () => {
				const deferredPromise = createDeferredPromise<IRun>();
				const ctx = createMockContext(
					{ resolveOffset: 'onCompletion' },
					'trigger',
					deferredPromise,
				);
				ctx.getWorkflowSettings.mockReturnValue({ executionTimeout: 1 }); // 1 second timeout
				const options: KafkaTriggerOptions = {};

				const emitter = configureDataEmitter(ctx, options, 1.3);
				const testData = [{ json: { message: 'test' } }];

				const resultPromise = emitter(testData);

				// Advance timers past the timeout
				jest.advanceTimersByTime(1001);

				const result = await resultPromise;

				expect(mockedSleep).toHaveBeenCalled();
				expect(ctx.logger.error).toHaveBeenCalled();
				expect(result).toEqual({ success: false });
			});

			it('should use default timeout of 3600 seconds when not configured', async () => {
				const deferredPromise = createDeferredPromise<IRun>();
				const ctx = createMockContext(
					{ resolveOffset: 'onCompletion' },
					'trigger',
					deferredPromise,
				);
				ctx.getWorkflowSettings.mockReturnValue({}); // No timeout configured
				const options: KafkaTriggerOptions = {};

				const emitter = configureDataEmitter(ctx, options, 1.3);
				const testData = [{ json: { message: 'test' } }];

				const resultPromise = emitter(testData);

				// Resolve before timeout
				deferredPromise.resolveWith({ status: 'success' } as unknown as IRun);

				const result = await resultPromise;

				expect(result).toEqual({ success: true });
			});

			it('should clear timeout when execution completes before timeout', async () => {
				const deferredPromise = createDeferredPromise<IRun>();
				const ctx = createMockContext(
					{ resolveOffset: 'onCompletion' },
					'trigger',
					deferredPromise,
				);
				ctx.getWorkflowSettings.mockReturnValue({ executionTimeout: 10 });
				const options: KafkaTriggerOptions = {};

				const emitter = configureDataEmitter(ctx, options, 1.3);
				const testData = [{ json: { message: 'test' } }];

				const resultPromise = emitter(testData);

				// Resolve quickly
				deferredPromise.resolveWith({ status: 'success' } as unknown as IRun);

				const result = await resultPromise;

				// Advance timers past what would have been the timeout
				jest.advanceTimersByTime(15000);

				// Should not have logged any timeout error
				expect(result).toEqual({ success: true });
			});
		});

		describe('error handling', () => {
			it('should handle promise rejection and return failure', async () => {
				const deferredPromise = createDeferredPromise<IRun>();
				const ctx = createMockContext(
					{ resolveOffset: 'onCompletion' },
					'trigger',
					deferredPromise,
				);
				const options: KafkaTriggerOptions = {};

				const emitter = configureDataEmitter(ctx, options, 1.3);
				const testData = [{ json: { message: 'test' } }];

				const resultPromise = emitter(testData);

				deferredPromise.rejectWith(new Error('Execution failed'));

				const result = await resultPromise;

				expect(mockedSleep).toHaveBeenCalledWith(5000);
				expect(ctx.logger.error).toHaveBeenCalledWith('Execution failed', expect.any(Object));
				expect(result).toEqual({ success: false });
			});

			it('should handle non-Error objects in catch block', async () => {
				const deferredPromise = createDeferredPromise<IRun>();
				const ctx = createMockContext(
					{ resolveOffset: 'onCompletion' },
					'trigger',
					deferredPromise,
				);
				const options: KafkaTriggerOptions = {};

				const emitter = configureDataEmitter(ctx, options, 1.3);
				const testData = [{ json: { message: 'test' } }];

				const resultPromise = emitter(testData);

				// Reject with a string instead of Error
				deferredPromise.rejectWith('String error' as unknown as Error);

				const result = await resultPromise;

				expect(mockedSleep).toHaveBeenCalled();
				expect(result).toEqual({ success: false });
			});
		});

		describe('data emission', () => {
			it('should emit data array wrapped in another array', async () => {
				const ctx = createMockContext({}, 'manual');
				const options: KafkaTriggerOptions = {};

				const emitter = configureDataEmitter(ctx, options, 1.3);
				const testData = [{ json: { message: 'test1' } }, { json: { message: 'test2' } }];

				await emitter(testData);

				expect(ctx.emit).toHaveBeenCalledWith([testData]);
			});

			it('should pass deferred promise to emit in deferred mode', async () => {
				const deferredPromise = createDeferredPromise<IRun>();
				const ctx = createMockContext(
					{ resolveOffset: 'onCompletion' },
					'trigger',
					deferredPromise,
				);
				const options: KafkaTriggerOptions = {};

				const emitter = configureDataEmitter(ctx, options, 1.3);
				const testData = [{ json: { message: 'test' } }];

				const resultPromise = emitter(testData);

				deferredPromise.resolveWith({ status: 'success' } as unknown as IRun);

				await resultPromise;

				expect(ctx.emit).toHaveBeenCalledWith([testData], undefined, deferredPromise);
			});
		});
	});
});
