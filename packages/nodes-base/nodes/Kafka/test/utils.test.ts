import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import type * as _importType0 from 'n8n-workflow';
import type {
	ITriggerFunctions,
	IRun,
	INode,
	Logger,
	IDeferredPromise,
	ICredentialDataDecryptedObject,
	NodeEgressFilter,
} from 'n8n-workflow';
import { createResultError, createResultOk, NodeOperationError, sleep } from 'n8n-workflow';
import http from 'node:http';
import https from 'node:https';
import type { LookupFunction } from 'node:net';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import {
	createSchemaRegistry,
	getAutoCommitSettings,
	configureDataEmitter,
	type KafkaTriggerOptions,
	getSchemaRegistryOptions,
	setSchemaRegistry,
} from '../utils';

vi.mock('@kafkajs/confluent-schema-registry');
vi.mock('n8n-workflow', async () => {
	const actual = await vi.importActual<typeof _importType0>('n8n-workflow');
	return {
		...actual,
		sleep: vi.fn().mockResolvedValue(undefined),
	};
});

const mockedSleep = vi.mocked(sleep);

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
					createDeferredPromise: vi.fn().mockReturnValue(deferredPromise),
				} as unknown as ITriggerFunctions['helpers'];
			}

			return ctx;
		};

		beforeEach(() => {
			vi.clearAllMocks();
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
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
				vi.advanceTimersByTime(1001);

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
				vi.advanceTimersByTime(15000);

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

	describe('schema registry helpers', () => {
		const registryNode: INode = {
			id: 'test-node-id',
			name: 'Test Kafka Trigger',
			type: 'n8n-nodes-base.kafkaTrigger',
			typeVersion: 1.3,
			position: [0, 0],
			parameters: {},
		};

		const createRegistryContext = ({
			params = {},
			nodeCredentials,
			credentialData,
			secureEgressFilter,
		}: {
			params?: Record<string, unknown>;
			nodeCredentials?: INode['credentials'];
			credentialData?: ICredentialDataDecryptedObject;
			secureEgressFilter?: NodeEgressFilter;
		} = {}) => {
			const ctx = mock<ITriggerFunctions>();
			ctx.getNode.mockReturnValue({ ...registryNode, credentials: nodeCredentials });
			ctx.getCredentials.mockResolvedValue(credentialData ?? {});
			ctx.getNodeParameter.mockImplementation(
				(name: string, fallback?: unknown) => (params[name] ?? fallback) as never,
			);
			ctx.logger = mock<Logger>();
			ctx.helpers = {
				...ctx.helpers,
				getSecureEgressFilter: vi.fn().mockReturnValue(secureEgressFilter),
			};
			return ctx;
		};

		const schemaRegistryNodeCredentials = {
			schemaRegistryApi: { id: '1', name: 'Schema Registry account' },
		};

		// Builds an egress filter whose validateUrl resolves to the given result and
		// whose createSecureLookup returns a stable sentinel, so tests can assert the
		// exact lookup is wired onto the agent.
		const createEgressFilter = (
			result: Awaited<ReturnType<NodeEgressFilter['validateUrl']>>,
		): { filter: NodeEgressFilter; lookup: LookupFunction; validateUrl: Mock } => {
			const lookup = vi.fn() as unknown as LookupFunction;
			const validateUrl = vi.fn().mockResolvedValue(result);
			const filter: NodeEgressFilter = {
				validateUrl,
				createSecureLookup: () => lookup,
			};
			return { filter, lookup, validateUrl };
		};

		const okFilter = () => createEgressFilter(createResultOk(undefined));
		const blockedFilter = (message = 'The request was blocked') =>
			createEgressFilter(createResultError(new Error(message)));

		// `options` is set on the agent at runtime but not part of the public type.
		const agentLookup = (agent?: http.Agent) =>
			(agent as unknown as { options?: { lookup?: LookupFunction } } | undefined)?.options?.lookup;

		beforeEach(() => {
			vi.clearAllMocks();
		});

		describe('getSchemaRegistryOptions', () => {
			it('should use the fallback URL when no credential is selected', async () => {
				const ctx = createRegistryContext();

				const result = await getSchemaRegistryOptions(ctx, 'https://fallback-registry.local');

				expect(result).toEqual({ host: 'https://fallback-registry.local' });
				expect(ctx.getCredentials).not.toHaveBeenCalled();
			});

			it('should trim the fallback URL', async () => {
				const ctx = createRegistryContext();

				const result = await getSchemaRegistryOptions(ctx, '  https://fallback-registry.local  ');

				expect(result).toEqual({ host: 'https://fallback-registry.local' });
			});

			it('should trim the credential URL', async () => {
				const ctx = createRegistryContext({
					nodeCredentials: schemaRegistryNodeCredentials,
					credentialData: {
						url: '  https://schema-registry.local:8081  ',
						authentication: 'none',
					},
				});

				const result = await getSchemaRegistryOptions(ctx, '');

				expect(result).toEqual({ host: 'https://schema-registry.local:8081' });
			});

			it('should return host and auth for a basicAuth credential', async () => {
				const ctx = createRegistryContext({
					nodeCredentials: schemaRegistryNodeCredentials,
					credentialData: {
						url: 'https://schema-registry.local:8081',
						authentication: 'basicAuth',
						username: 'registry-user',
						password: 'registry-password',
					},
				});

				const result = await getSchemaRegistryOptions(ctx, '');

				expect(ctx.getCredentials).toHaveBeenCalledWith('schemaRegistryApi');
				expect(result).toEqual({
					host: 'https://schema-registry.local:8081',
					auth: { username: 'registry-user', password: 'registry-password' },
				});
			});

			it('should return only the host for a credential without authentication', async () => {
				const ctx = createRegistryContext({
					nodeCredentials: schemaRegistryNodeCredentials,
					credentialData: {
						url: 'https://schema-registry.local:8081',
						authentication: 'none',
					},
				});

				const result = await getSchemaRegistryOptions(ctx, '');

				expect(result).toEqual({ host: 'https://schema-registry.local:8081' });
				expect(result).not.toHaveProperty('auth');
			});

			it('should throw when basicAuth credential is missing the password', async () => {
				const ctx = createRegistryContext({
					nodeCredentials: schemaRegistryNodeCredentials,
					credentialData: {
						url: 'https://schema-registry.local:8081',
						authentication: 'basicAuth',
						username: 'registry-user',
						password: '',
					},
				});

				await expect(getSchemaRegistryOptions(ctx, '')).rejects.toThrow(NodeOperationError);
				await expect(getSchemaRegistryOptions(ctx, '')).rejects.toThrow(
					'Username and password are required for Schema Registry Basic Auth',
				);
			});

			it('should throw when no credential is selected and the fallback URL is blank', async () => {
				const ctx = createRegistryContext();

				await expect(getSchemaRegistryOptions(ctx, '  ')).rejects.toThrow(NodeOperationError);
				await expect(getSchemaRegistryOptions(ctx, '  ')).rejects.toThrow(
					'Select a Schema Registry credential or enter a Schema Registry URL',
				);
				expect(ctx.getCredentials).not.toHaveBeenCalled();
			});

			it('should throw when the selected credential has a blank URL', async () => {
				const ctx = createRegistryContext({
					nodeCredentials: schemaRegistryNodeCredentials,
					credentialData: {
						url: '  ',
						authentication: 'none',
					},
				});

				await expect(getSchemaRegistryOptions(ctx, '')).rejects.toThrow(NodeOperationError);
				await expect(getSchemaRegistryOptions(ctx, '')).rejects.toThrow(
					'Select a Schema Registry credential or enter a Schema Registry URL',
				);
			});
		});

		describe('createSchemaRegistry', () => {
			const lastConstructorArg = () => {
				const calls = (SchemaRegistry as Mock).mock.calls;
				return calls[calls.length - 1][0] as {
					host: string;
					agent?: http.Agent;
					auth?: { username: string; password: string };
				};
			};

			it('rejects a space-injected host when egress filtering is enabled', async () => {
				const { filter, validateUrl } = okFilter();
				const ctx = createRegistryContext({ secureEgressFilter: filter });

				const error = await createSchemaRegistry(ctx, 'http://169.254.169.254:80 /v').catch(
					(e: unknown) => e,
				);

				expect(error).toBeInstanceOf(NodeOperationError);
				expect((error as NodeOperationError).description).toBe(
					'The Schema Registry URL is not a valid URL',
				);
				expect(SchemaRegistry).not.toHaveBeenCalled();
				expect(validateUrl).not.toHaveBeenCalled();
			});

			it('rejects an unparseable host when egress filtering is enabled', async () => {
				const { filter, validateUrl } = okFilter();
				const ctx = createRegistryContext({ secureEgressFilter: filter });

				await expect(createSchemaRegistry(ctx, 'not a url')).rejects.toThrow(NodeOperationError);
				expect(SchemaRegistry).not.toHaveBeenCalled();
				expect(validateUrl).not.toHaveBeenCalled();
			});

			it('rejects a non-http(s) scheme when egress filtering is enabled', async () => {
				const { filter, validateUrl } = okFilter();
				const ctx = createRegistryContext({ secureEgressFilter: filter });

				await expect(createSchemaRegistry(ctx, 'ftp://internal/')).rejects.toThrow(
					NodeOperationError,
				);
				expect(SchemaRegistry).not.toHaveBeenCalled();
				expect(validateUrl).not.toHaveBeenCalled();
			});

			it('rejects an IPv6-literal host when its addresses are blocked', async () => {
				const { filter } = blockedFilter();
				const ctx = createRegistryContext({ secureEgressFilter: filter });

				await expect(createSchemaRegistry(ctx, 'http://[::1]:8081')).rejects.toThrow(
					NodeOperationError,
				);
				expect(SchemaRegistry).not.toHaveBeenCalled();
			});

			it('rejects a direct-IP registry host when egress filtering is enabled', async () => {
				const { filter, validateUrl } = blockedFilter();
				const ctx = createRegistryContext({ secureEgressFilter: filter });

				await expect(createSchemaRegistry(ctx, 'http://169.254.169.254')).rejects.toThrow(
					NodeOperationError,
				);
				expect(validateUrl).toHaveBeenCalled();
				expect(SchemaRegistry).not.toHaveBeenCalled();
			});

			it('passes an http agent carrying the secure lookup for an http host', async () => {
				const { filter, lookup } = okFilter();
				const input = 'http://schema-registry.local:8081';
				const ctx = createRegistryContext({ secureEgressFilter: filter });

				await createSchemaRegistry(ctx, input);

				const arg = lastConstructorArg();
				expect(arg.host).toBe(new URL(input).href);
				expect(arg.agent).toBeInstanceOf(http.Agent);
				expect(arg.agent).not.toBeInstanceOf(https.Agent);
				expect(agentLookup(arg.agent)).toBe(lookup);
			});

			it('passes an https agent for an https host', async () => {
				const { filter, lookup } = okFilter();
				const input = 'https://schema-registry.local:8081';
				const ctx = createRegistryContext({ secureEgressFilter: filter });

				await createSchemaRegistry(ctx, input);

				const arg = lastConstructorArg();
				expect(arg.host).toBe(new URL(input).href);
				expect(arg.agent).toBeInstanceOf(https.Agent);
				expect(agentLookup(arg.agent)).toBe(lookup);
			});

			it('normalizes the host and selects the agent by scheme', async () => {
				const { filter, validateUrl } = okFilter();
				const input = 'HTTP://Schema-Registry.local:8081';
				const ctx = createRegistryContext({ secureEgressFilter: filter });

				await createSchemaRegistry(ctx, input);

				const arg = lastConstructorArg();
				expect(arg.host).toBe('http://schema-registry.local:8081/');
				expect(arg.agent).toBeInstanceOf(http.Agent);
				expect(arg.agent).not.toBeInstanceOf(https.Agent);
				// The filter must validate the canonical URL that is actually connected to,
				// not the raw input string (which differs after canonicalization).
				expect(validateUrl).toHaveBeenCalledWith(new URL(input));
			});

			it('preserves a base path without adding a trailing slash', async () => {
				const { filter } = okFilter();
				const ctx = createRegistryContext({ secureEgressFilter: filter });

				await createSchemaRegistry(ctx, 'https://schema-registry.local/base');

				const arg = lastConstructorArg();
				expect(arg.host).toBe('https://schema-registry.local/base');
			});

			it('still applies basic auth alongside the secure agent', async () => {
				const { filter, lookup } = okFilter();
				const input = 'https://schema-registry.local:8081';
				const ctx = createRegistryContext({
					secureEgressFilter: filter,
					nodeCredentials: schemaRegistryNodeCredentials,
					credentialData: {
						url: input,
						authentication: 'basicAuth',
						username: 'registry-user',
						password: 'registry-password',
					},
				});

				await createSchemaRegistry(ctx, '');

				const arg = lastConstructorArg();
				expect(arg.host).toBe(new URL(input).href);
				expect(arg.auth).toEqual({ username: 'registry-user', password: 'registry-password' });
				expect(arg.agent).toBeInstanceOf(https.Agent);
				expect(agentLookup(arg.agent)).toBe(lookup);
			});

			it('constructs the registry without an agent or pre-flight when egress filtering is not configured', async () => {
				const ctx = createRegistryContext();

				await createSchemaRegistry(ctx, 'http://169.254.169.254:80 /v');

				const arg = lastConstructorArg();
				expect(arg).toEqual({ host: 'http://169.254.169.254:80 /v' });
				expect(arg).not.toHaveProperty('agent');
			});

			it('throws a NodeOperationError surfaced as the continueOnFail item message', async () => {
				const { filter } = blockedFilter('The request was blocked by egress rules');
				const ctx = createRegistryContext({ secureEgressFilter: filter });

				const error = await createSchemaRegistry(ctx, 'http://169.254.169.254').catch(
					(e: unknown) => e,
				);

				expect(error).toBeInstanceOf(NodeOperationError);
				expect((error as NodeOperationError).message).toBe(
					'Verify your Schema Registry configuration',
				);
			});
		});

		describe('setSchemaRegistry', () => {
			it('should return undefined and not construct a registry when disabled', async () => {
				const ctx = createRegistryContext({ params: { useSchemaRegistry: false } });

				const result = await setSchemaRegistry(ctx);

				expect(result).toBeUndefined();
				expect(SchemaRegistry).not.toHaveBeenCalled();
			});

			it('should construct the registry with credential options', async () => {
				const ctx = createRegistryContext({
					params: { useSchemaRegistry: true, schemaRegistryUrl: '' },
					nodeCredentials: schemaRegistryNodeCredentials,
					credentialData: {
						url: 'https://schema-registry.local:8081',
						authentication: 'basicAuth',
						username: 'registry-user',
						password: 'registry-password',
					},
				});

				const result = await setSchemaRegistry(ctx);

				expect(SchemaRegistry).toHaveBeenCalledWith({
					host: 'https://schema-registry.local:8081',
					auth: { username: 'registry-user', password: 'registry-password' },
				});
				expect(result).toBeDefined();
			});

			it('should warn with a sanitized payload and continue on connection-type errors', async () => {
				const ctx = createRegistryContext({
					params: {
						useSchemaRegistry: true,
						schemaRegistryUrl: 'https://fallback-registry.local',
					},
				});
				const connectionError = Object.assign(new Error('connect ECONNREFUSED'), {
					status: 503,
				});
				(SchemaRegistry as Mock).mockImplementationOnce(function () {
					throw connectionError;
				});

				const result = await setSchemaRegistry(ctx);

				expect(result).toBeUndefined();
				expect(ctx.logger.warn).toHaveBeenCalledWith('Could not connect to Schema Registry', {
					message: 'connect ECONNREFUSED',
					status: 503,
				});
			});

			it('should redact URL userinfo and omit status in the warn payload when absent', async () => {
				const ctx = createRegistryContext({
					params: {
						useSchemaRegistry: true,
						schemaRegistryUrl: 'https://fallback-registry.local',
					},
				});
				(SchemaRegistry as Mock).mockImplementationOnce(function () {
					throw new Error(
						'request to https://registry-user:registry-password@fallback-registry.local/subjects failed',
					);
				});

				const result = await setSchemaRegistry(ctx);

				expect(result).toBeUndefined();
				const [logMessage, logPayload] = vi.mocked(ctx.logger.warn).mock.calls[0];
				expect(logMessage).toBe('Could not connect to Schema Registry');
				expect(logPayload).toStrictEqual({
					message: 'request to https://***@fallback-registry.local/subjects failed',
				});
			});

			it('should redact userinfo up to the last @ when the password contains an unencoded @', async () => {
				const ctx = createRegistryContext({
					params: {
						useSchemaRegistry: true,
						schemaRegistryUrl: 'https://fallback-registry.local',
					},
				});
				(SchemaRegistry as Mock).mockImplementationOnce(function () {
					throw new Error(
						'request to https://registry-user:p@ssw0rd@fallback-registry.local/subjects failed',
					);
				});

				const result = await setSchemaRegistry(ctx);

				expect(result).toBeUndefined();
				const [, logPayload] = vi.mocked(ctx.logger.warn).mock.calls[0];
				expect(logPayload).toStrictEqual({
					message: 'request to https://***@fallback-registry.local/subjects failed',
				});
			});

			it('should cap the logged message length for oversized registry errors', async () => {
				const ctx = createRegistryContext({
					params: {
						useSchemaRegistry: true,
						schemaRegistryUrl: 'https://fallback-registry.local',
					},
				});
				(SchemaRegistry as Mock).mockImplementationOnce(function () {
					throw new Error('x'.repeat(2000));
				});

				const result = await setSchemaRegistry(ctx);

				expect(result).toBeUndefined();
				const [, logPayload] = vi.mocked(ctx.logger.warn).mock.calls[0];
				const { message } = logPayload as { message: string };
				expect(message).toHaveLength(503);
				expect(message.endsWith('...')).toBe(true);
			});

			it('should rethrow misconfiguration errors instead of warning', async () => {
				const ctx = createRegistryContext({
					params: { useSchemaRegistry: true, schemaRegistryUrl: '' },
				});

				await expect(setSchemaRegistry(ctx)).rejects.toThrow(NodeOperationError);
				await expect(setSchemaRegistry(ctx)).rejects.toThrow(
					'Select a Schema Registry credential or enter a Schema Registry URL',
				);
				expect(ctx.logger.warn).not.toHaveBeenCalled();
			});

			it('should rethrow misconfiguration errors when the fallback URL is whitespace-only', async () => {
				const ctx = createRegistryContext({
					params: { useSchemaRegistry: true, schemaRegistryUrl: '   ' },
				});

				await expect(setSchemaRegistry(ctx)).rejects.toThrow(NodeOperationError);
				await expect(setSchemaRegistry(ctx)).rejects.toThrow(
					'Select a Schema Registry credential or enter a Schema Registry URL',
				);
				expect(ctx.logger.warn).not.toHaveBeenCalled();
			});

			it('constructs the activation registry with a secure agent when egress filtering is enabled', async () => {
				const { filter, lookup } = okFilter();
				const ctx = createRegistryContext({
					params: {
						useSchemaRegistry: true,
						schemaRegistryUrl: 'http://schema-registry.local:8081',
					},
					secureEgressFilter: filter,
				});

				const result = await setSchemaRegistry(ctx);

				expect(result).toBeDefined();
				const arg = (SchemaRegistry as Mock).mock.calls[0][0] as {
					host: string;
					agent?: http.Agent;
				};
				expect(arg.host).toBe('http://schema-registry.local:8081/');
				expect(agentLookup(arg.agent)).toBe(lookup);
			});

			it('fails activation loudly when the registry host is blocked', async () => {
				const { filter } = blockedFilter();
				const ctx = createRegistryContext({
					params: {
						useSchemaRegistry: true,
						schemaRegistryUrl: 'http://schema-registry.local:8081',
					},
					secureEgressFilter: filter,
				});

				await expect(setSchemaRegistry(ctx)).rejects.toThrow(NodeOperationError);
				expect(SchemaRegistry).not.toHaveBeenCalled();
				expect(ctx.logger.warn).not.toHaveBeenCalled();
			});
		});
	});
});
