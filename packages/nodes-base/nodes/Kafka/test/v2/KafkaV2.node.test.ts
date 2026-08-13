import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import type {
	IDataObject,
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	INodeTypeBaseDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { KafkaV2 } from '../../v2/KafkaV2.node';
import { getKafkaLibrary } from '../../v2/transport/client';
import { confluentKafkaModuleMock } from '../mocks/confluent-kafka';

// Same reasoning as the v1 test file: the node is imported directly (through vite)
// so vi.mock can intercept its library imports; NodeTestHarness loads from dist via
// require(), where vi.mock can't reach it.
const baseDescription: INodeTypeBaseDescription = {
	displayName: 'Kafka',
	name: 'kafka',
	group: ['transform'],
	description: 'Sends messages to a Kafka topic',
};

const {
	kafkajsLoadCount,
	mockProducerConnect,
	mockProducerSendBatch,
	mockProducerDisconnect,
	mockProducerFactory,
	mockRegistryEncode,
	mockRegistryGetLatestSchemaId,
} = vi.hoisted(() => {
	const kafkajsLoadCount = { value: 0 };

	const mockProducerConnect = vi.fn(async () => {});
	const mockProducerSendBatch = vi.fn(async () => [] as unknown[]);
	const mockProducerDisconnect = vi.fn(async () => {});
	const mockProducerFactory = vi.fn(() => ({
		connect: mockProducerConnect,
		sendBatch: mockProducerSendBatch,
		disconnect: mockProducerDisconnect,
	}));

	const mockRegistryEncode = vi.fn(async (_id: number, input: unknown) =>
		Buffer.from(JSON.stringify(input)),
	);
	const mockRegistryGetLatestSchemaId = vi.fn(async (eventName: string) => {
		if (eventName === 'failing-event-name') {
			throw new Error('Subject not found');
		}
		return 1;
	});

	return {
		kafkajsLoadCount,
		mockProducerConnect,
		mockProducerSendBatch,
		mockProducerDisconnect,
		mockProducerFactory,
		mockRegistryEncode,
		mockRegistryGetLatestSchemaId,
	};
});

vi.mock('@confluentinc/kafka-javascript', () => confluentKafkaModuleMock());

// Counts module loads, not property reads: `kafkajs` reaching v2 would do so through
// a static value import somewhere in its graph (e.g. the shared `utils.ts`), which
// resolves once at import time — so the counter is never reset between tests.
vi.mock('kafkajs', () => {
	kafkajsLoadCount.value += 1;
	return { logLevel: { NOTHING: 0, ERROR: 1, WARN: 2, INFO: 3, DEBUG: 4 } };
});

vi.mock('@kafkajs/confluent-schema-registry', () => ({
	SchemaRegistry: vi.fn(function () {
		return {
			getLatestSchemaId: mockRegistryGetLatestSchemaId,
			encode: mockRegistryEncode,
		};
	}),
}));

const defaultKafkaCredentials: IDataObject = {
	brokers: 'localhost:9092',
	clientId: 'test-client',
	ssl: false,
	authentication: false,
};

// A param value may be a `(index) => value` function, so the item index the node
// reads a per-item parameter at is actually observable.
type NodeParams = Record<string, unknown>;

const mockLoggerWarn = vi.fn();

function createExecuteFunctions(
	params: NodeParams,
	items: INodeExecutionData[],
	options: {
		schemaRegistryCredential?: IDataObject;
		continueOnFail?: boolean;
	} = {},
) {
	const { schemaRegistryCredential, continueOnFail = false } = options;

	const node = mock<INode>({
		name: 'Kafka',
		credentials: schemaRegistryCredential
			? { schemaRegistryApi: { id: 'wW0eW1iZK9d3Yz2g', name: 'Schema Registry account' } }
			: undefined,
	});

	return mock<IExecuteFunctions>({
		getInputData: () => items,
		getNode: () => node,
		logger: mock<IExecuteFunctions['logger']>({ warn: mockLoggerWarn }),
		getNodeParameter: ((name: string, index: number, fallback?: unknown) => {
			if (!(name in params)) return fallback;
			const value = params[name];
			return typeof value === 'function' ? (value as (i: number) => unknown)(index) : value;
		}) as IExecuteFunctions['getNodeParameter'],
		getCredentials: (async (type: string) =>
			type === 'schemaRegistryApi'
				? schemaRegistryCredential
				: defaultKafkaCredentials) as IExecuteFunctions['getCredentials'],
		continueOnFail: () => continueOnFail,
		helpers: {
			returnJsonArray: (data: IDataObject | IDataObject[]) =>
				(Array.isArray(data) ? data : [data]).map((json) => ({ json })),
			constructExecutionMetaData: (data: INodeExecutionData[]) => data,
		} as unknown as IExecuteFunctions['helpers'],
	});
}

const schemaRegistryCredential = {
	url: 'https://cred-kafka-registry.local',
	authentication: 'basicAuth',
	username: 'registry-user',
	password: 'registry-password',
};

describe('KafkaV2 Node', () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		// The shared fake's own `Kafka` mock returns a fresh, uninstrumented stub producer
		// per instance — fine for the transport-level tests, but this file needs the same
		// controllable producer across calls, so the constructor implementation is
		// overridden (still through the shared fake's `vi.mock`, so lazy-loading semantics
		// stay real) to return `mockProducerFactory`'s producer instead.
		const { Kafka } = await getKafkaLibrary();
		vi.mocked(Kafka).mockImplementation(function (config?: unknown) {
			return {
				config,
				connect: vi.fn(),
				disconnect: vi.fn(),
				producer: mockProducerFactory,
				consumer: vi.fn(),
				admin: vi.fn(),
			};
		});
	});

	test('never loads the v1 kafkajs library', async () => {
		const params: IDataObject = {
			options: {},
			sendInputData: true,
			useSchemaRegistry: false,
			topic: 'test-topic',
			jsonParameters: false,
			useKey: false,
			headersUi: {},
		};
		const items: INodeExecutionData[] = [{ json: { name: 'item' } }];

		await new KafkaV2(baseDescription).execute.call(createExecuteFunctions(params, items));

		expect(kafkajsLoadCount.value).toBe(0);
	});

	test('publishes input data as messages with key and headers unchanged, acks/timeout on the producer config', async () => {
		const params: IDataObject = {
			options: { acks: true, compression: 'none', timeout: 1000 },
			sendInputData: true,
			useSchemaRegistry: false,
			topic: 'test-topic',
			jsonParameters: false,
			useKey: true,
			key: 'messageKey',
			headersUi: { headerValues: [{ key: 'header', value: 'value' }] },
		};
		const items: INodeExecutionData[] = [
			{ json: { name: 'First item', code: 1 } },
			{ json: { name: 'Second item', code: 2 } },
		];

		await new KafkaV2(baseDescription).execute.call(createExecuteFunctions(params, items));

		expect(mockProducerFactory).toHaveBeenCalledWith({
			kafkaJS: { acks: -1, timeout: 1000, allowAutoTopicCreation: true, compression: 'none' },
		});
		expect(mockProducerConnect).toHaveBeenCalledTimes(1);
		expect(mockProducerSendBatch).toHaveBeenCalledTimes(1);
		expect(mockProducerSendBatch).toHaveBeenCalledWith({
			topicMessages: [
				{
					messages: [
						{
							headers: { header: 'value' },
							key: 'messageKey',
							value: '{"name":"First item","code":1}',
						},
					],
					topic: 'test-topic',
				},
				{
					messages: [
						{
							headers: { header: 'value' },
							key: 'messageKey',
							value: '{"name":"Second item","code":2}',
						},
					],
					topic: 'test-topic',
				},
			],
		});
		expect(mockProducerDisconnect).toHaveBeenCalledTimes(1);
	});

	test('maps acks off to 0 and falls back to the default timeout and compression when the options are unset', async () => {
		const params: IDataObject = {
			options: {},
			sendInputData: false,
			useSchemaRegistry: false,
			topic: 'test-topic',
			jsonParameters: false,
			useKey: false,
			message: 'plain message',
			headersUi: {},
		};
		const items: INodeExecutionData[] = [{ json: {} }];

		await new KafkaV2(baseDescription).execute.call(createExecuteFunctions(params, items));

		expect(mockProducerFactory).toHaveBeenCalledWith({
			kafkaJS: { acks: 0, timeout: 30000, allowAutoTopicCreation: true, compression: 'none' },
		});
		expect(mockProducerSendBatch).toHaveBeenCalledWith({
			topicMessages: [
				{
					messages: [{ headers: {}, key: null, value: 'plain message' }],
					topic: 'test-topic',
				},
			],
		});
	});

	// 'none' included: it must reach the config as an explicit codec, since the
	// native library crashes on an undefined value.
	test.each(['none', 'gzip', 'snappy', 'lz4', 'zstd'])(
		'passes the %s compression codec to the producer',
		async (compression) => {
			const params: IDataObject = {
				options: { compression },
				sendInputData: false,
				useSchemaRegistry: false,
				topic: 'test-topic',
				jsonParameters: false,
				useKey: false,
				message: 'plain message',
				headersUi: {},
			};

			await new KafkaV2(baseDescription).execute.call(
				createExecuteFunctions(params, [{ json: {} }]),
			);

			expect(mockProducerFactory).toHaveBeenCalledWith({
				kafkaJS: { acks: 0, timeout: 30000, allowAutoTopicCreation: true, compression },
			});
		},
	);

	test('reads the topic and key per item', async () => {
		const params: NodeParams = {
			options: {},
			sendInputData: true,
			useSchemaRegistry: false,
			topic: (i: number) => `topic-${i}`,
			jsonParameters: false,
			useKey: true,
			key: (i: number) => `key-${i}`,
			headersUi: {},
		};
		const items: INodeExecutionData[] = [{ json: { a: 1 } }, { json: { a: 2 } }];

		await new KafkaV2(baseDescription).execute.call(createExecuteFunctions(params, items));

		expect(mockProducerSendBatch).toHaveBeenCalledWith({
			topicMessages: [
				{ messages: [{ headers: {}, key: 'key-0', value: '{"a":1}' }], topic: 'topic-0' },
				{ messages: [{ headers: {}, key: 'key-1', value: '{"a":2}' }], topic: 'topic-1' },
			],
		});
	});

	test('reports success when the broker returns no record metadata', async () => {
		const params: NodeParams = {
			options: {},
			sendInputData: true,
			useSchemaRegistry: false,
			topic: 'test-topic',
			jsonParameters: false,
			useKey: false,
			headersUi: {},
		};
		const items: INodeExecutionData[] = [{ json: { name: 'item' } }];

		const result = await new KafkaV2(baseDescription).execute.call(
			createExecuteFunctions(params, items),
		);

		expect(result).toEqual([[{ json: { success: true } }]]);
	});

	test('returns the broker record metadata as item data', async () => {
		mockProducerSendBatch.mockResolvedValueOnce([{ topicName: 't', partition: 0, offset: '1' }]);

		const params: NodeParams = {
			options: {},
			sendInputData: true,
			useSchemaRegistry: false,
			topic: 't',
			jsonParameters: false,
			useKey: false,
			headersUi: {},
		};
		const items: INodeExecutionData[] = [{ json: { name: 'item' } }];

		const result = await new KafkaV2(baseDescription).execute.call(
			createExecuteFunctions(params, items),
		);

		expect(result).toEqual([[{ json: { topicName: 't', partition: 0, offset: '1' } }]]);
	});

	test('publishes a schema-registry-encoded message as the encoded bytes', async () => {
		const params: IDataObject = {
			options: {},
			sendInputData: false,
			useSchemaRegistry: true,
			message: JSON.stringify({ foo: 'bar' }),
			schemaRegistryUrl: 'https://test-kafka-registry.local',
			eventName: 'test-event-name',
			topic: 'test-topic',
			jsonParameters: true,
			useKey: false,
			headerParametersJson: '{\n  "headerKey": "headerValue"\n}',
		};
		const items: INodeExecutionData[] = [{ json: { success: true } }];

		await new KafkaV2(baseDescription).execute.call(createExecuteFunctions(params, items));

		expect(SchemaRegistry).toHaveBeenCalledWith({ host: 'https://test-kafka-registry.local' });
		expect(mockRegistryGetLatestSchemaId).toHaveBeenCalledWith('test-event-name');
		expect(mockRegistryEncode).toHaveBeenCalledWith(1, { foo: 'bar' });

		expect(mockProducerSendBatch).toHaveBeenCalledWith({
			topicMessages: [
				{
					messages: [
						{
							headers: { headerKey: 'headerValue' },
							key: null,
							value: Buffer.from(JSON.stringify({ foo: 'bar' })),
						},
					],
					topic: 'test-topic',
				},
			],
		});
	});

	const sendParams: NodeParams = {
		options: {},
		sendInputData: false,
		useSchemaRegistry: false,
		message: 'plain message',
		topic: 'test-topic',
		jsonParameters: false,
		useKey: false,
		headersUi: {},
	};

	test('disconnects the producer even when sendBatch rejects', async () => {
		mockProducerSendBatch.mockRejectedValueOnce(new Error('broker unreachable'));

		await expect(
			new KafkaV2(baseDescription).execute.call(createExecuteFunctions(sendParams, [{ json: {} }])),
		).rejects.toThrow('broker unreachable');

		expect(mockProducerDisconnect).toHaveBeenCalledTimes(1);
	});

	test('surfaces the send error, not the disconnect error, when both reject', async () => {
		mockProducerSendBatch.mockRejectedValueOnce(new Error('broker unreachable'));
		mockProducerDisconnect.mockRejectedValueOnce(new Error('disconnect failed'));

		await expect(
			new KafkaV2(baseDescription).execute.call(createExecuteFunctions(sendParams, [{ json: {} }])),
		).rejects.toThrow('broker unreachable');

		// Swallowed, but not silently: a native client that fails to disconnect leaks threads.
		expect(mockLoggerWarn).toHaveBeenCalledWith('Kafka producer failed to disconnect', {
			error: 'disconnect failed',
		});
	});

	test('still returns the send result when only the disconnect rejects', async () => {
		mockProducerSendBatch.mockResolvedValueOnce([{ topicName: 'test-topic', partition: 0 }]);
		mockProducerDisconnect.mockRejectedValueOnce(new Error('disconnect failed'));

		const result = await new KafkaV2(baseDescription).execute.call(
			createExecuteFunctions(sendParams, [{ json: {} }]),
		);

		// The message was accepted by the broker, so a failed cleanup must not fail the item.
		expect(result).toEqual([[{ json: { topicName: 'test-topic', partition: 0 } }]]);
	});

	test('rejects a non-string header value before the producer is created', async () => {
		const params: NodeParams = {
			...sendParams,
			jsonParameters: true,
			headerParametersJson: '{"retries":3}',
		};

		await expect(
			new KafkaV2(baseDescription).execute.call(createExecuteFunctions(params, [{ json: {} }])),
		).rejects.toThrow('Header "retries" must be a string');

		expect(mockProducerFactory).not.toHaveBeenCalled();
		expect(mockProducerSendBatch).not.toHaveBeenCalled();
	});

	test('attributes malformed JSON headers to the failing item', async () => {
		const params: NodeParams = {
			...sendParams,
			jsonParameters: true,
			headerParametersJson: (i: number) => (i === 1 ? 'not json' : '{"ok":"yes"}'),
		};

		const error = await new KafkaV2(baseDescription).execute
			.call(createExecuteFunctions(params, [{ json: {} }, { json: {} }]))
			.catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(NodeOperationError);
		expect((error as NodeOperationError).message).toBe('Headers must be valid JSON');
		expect((error as NodeOperationError).context.itemIndex).toBe(1);
	});

	test('disconnects and propagates the connect error when connect rejects', async () => {
		mockProducerConnect.mockRejectedValueOnce(new Error('connection refused'));

		await expect(
			new KafkaV2(baseDescription).execute.call(createExecuteFunctions(sendParams, [{ json: {} }])),
		).rejects.toThrow('connection refused');

		expect(mockProducerSendBatch).not.toHaveBeenCalled();
		expect(mockProducerDisconnect).toHaveBeenCalledTimes(1);
	});

	test('returns the send error as item data when the node continues on fail', async () => {
		mockProducerSendBatch.mockRejectedValueOnce(new Error('broker unreachable'));

		const result = await new KafkaV2(baseDescription).execute.call(
			createExecuteFunctions(sendParams, [{ json: {} }], { continueOnFail: true }),
		);

		expect(result).toEqual([
			[{ json: { error: 'broker unreachable' }, pairedItem: [{ item: 0 }] }],
		]);
		expect(mockProducerDisconnect).toHaveBeenCalledTimes(1);
	});

	test('resolves the schema once and encodes every item', async () => {
		const params: NodeParams = {
			options: {},
			sendInputData: true,
			useSchemaRegistry: true,
			schemaRegistryUrl: 'https://test-kafka-registry.local',
			eventName: 'test-event-name',
			topic: 'test-topic',
			jsonParameters: false,
			useKey: false,
			headersUi: {},
		};
		const items: INodeExecutionData[] = [{ json: { a: 1 } }, { json: { a: 2 } }];

		await new KafkaV2(baseDescription).execute.call(createExecuteFunctions(params, items));

		expect(mockRegistryGetLatestSchemaId).toHaveBeenCalledTimes(1);
		expect(mockRegistryEncode).toHaveBeenCalledTimes(2);
		expect(mockRegistryEncode).toHaveBeenNthCalledWith(1, 1, { a: 1 });
		expect(mockRegistryEncode).toHaveBeenNthCalledWith(2, 1, { a: 2 });
	});

	test('fails before the producer is built when the message is not valid JSON', async () => {
		const params: NodeParams = {
			options: {},
			sendInputData: false,
			useSchemaRegistry: true,
			message: 'not-json',
			schemaRegistryUrl: 'https://test-kafka-registry.local',
			eventName: 'test-event-name',
			topic: 'test-topic',
		};

		await expect(
			new KafkaV2(baseDescription).execute.call(createExecuteFunctions(params, [{ json: {} }])),
		).rejects.toThrow('Message is not valid JSON');

		expect(mockProducerFactory).not.toHaveBeenCalled();
	});

	test('fails before the producer is built when the JSON headers are not valid JSON', async () => {
		const params: NodeParams = {
			options: {},
			sendInputData: false,
			useSchemaRegistry: false,
			message: 'plain message',
			topic: 'test-topic',
			jsonParameters: true,
			useKey: false,
			headerParametersJson: 'not-json',
		};

		await expect(
			new KafkaV2(baseDescription).execute.call(createExecuteFunctions(params, [{ json: {} }])),
		).rejects.toThrow('Headers must be valid JSON');

		expect(mockProducerFactory).not.toHaveBeenCalled();
	});

	test('should configure the schema registry from the selected credential', async () => {
		const params: IDataObject = {
			options: {},
			sendInputData: false,
			useSchemaRegistry: true,
			message: JSON.stringify({ foo: 'bar' }),
			schemaRegistryUrl: '',
			eventName: 'test-event-name',
			topic: 'cred-test-topic',
			jsonParameters: true,
			useKey: false,
			headerParametersJson: '{\n  "headerKey": "headerValue"\n}',
		};
		const items: INodeExecutionData[] = [{ json: { success: true } }];

		await new KafkaV2(baseDescription).execute.call(
			createExecuteFunctions(params, items, { schemaRegistryCredential }),
		);

		expect(SchemaRegistry).toHaveBeenCalledWith({
			host: 'https://cred-kafka-registry.local',
			auth: { username: 'registry-user', password: 'registry-password' },
		});
	});

	test('should fail with the generic message when the schema lookup fails', async () => {
		const params: IDataObject = {
			options: {},
			sendInputData: false,
			useSchemaRegistry: true,
			message: '{"foo":"bar"}',
			schemaRegistryUrl: '',
			eventName: 'failing-event-name',
			topic: 'error-test-topic',
		};
		const items: INodeExecutionData[] = [{ json: {} }];

		await expect(
			new KafkaV2(baseDescription).execute.call(
				createExecuteFunctions(params, items, { schemaRegistryCredential }),
			),
		).rejects.toThrow('Verify your Schema Registry configuration');

		expect(mockProducerFactory).not.toHaveBeenCalled();
	});

	test('should return the error as item data when the node continues on fail', async () => {
		const params: IDataObject = {
			options: {},
			sendInputData: false,
			useSchemaRegistry: true,
			message: '{"foo":"bar"}',
			schemaRegistryUrl: '',
			eventName: 'test-event-name',
			topic: 'error-test-topic',
		};
		const items: INodeExecutionData[] = [{ json: {} }];

		const result = await new KafkaV2(baseDescription).execute.call(
			createExecuteFunctions(params, items, {
				schemaRegistryCredential: { ...schemaRegistryCredential, password: '' },
				continueOnFail: true,
			}),
		);

		expect(result).toEqual([
			[
				expect.objectContaining({
					json: { error: 'Username and password are required for Schema Registry Basic Auth' },
				}),
			],
		]);
	});
});
