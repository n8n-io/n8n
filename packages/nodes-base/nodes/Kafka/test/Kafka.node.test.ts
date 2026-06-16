import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import type * as _kafkajs from 'kafkajs';
import type { IDataObject, IExecuteFunctions, INode, INodeExecutionData } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { Kafka } from '../Kafka.node';

// The node is imported directly (through vite) so vi.mock can intercept its
// `kafkajs` / `@kafkajs/confluent-schema-registry` imports. NodeTestHarness can't
// be used here: it loads nodes from dist via require(), where vi.mock can't reach
// them. So every node run goes through `new Kafka().execute.call(...)`.
//
// The constructor mocks use `vi.fn(function () { ... })` (not `mockReturnValue`):
// the node calls `new apacheKafka(...)` / `new SchemaRegistry(...)`, and vitest
// throws "Cannot use mockReturnValue when called with new". importActual keeps the
// real `CompressionTypes` enum the node relies on.
const {
	mockProducerConnect,
	mockProducerSend,
	mockProducerDisconnect,
	mockRegistryEncode,
	mockRegistryGetLatestSchemaId,
} = vi.hoisted(() => {
	const mockProducerConnect = vi.fn(async () => {});
	const mockProducerSend = vi.fn(async () => [] as unknown[]);
	const mockProducerDisconnect = vi.fn(async () => {});
	const mockProducer = {
		connect: mockProducerConnect,
		send: mockProducerSend,
		sendBatch: mockProducerSend,
		disconnect: mockProducerDisconnect,
	};

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
		mockProducerConnect,
		mockProducerSend,
		mockProducerDisconnect,
		mockRegistryEncode,
		mockRegistryGetLatestSchemaId,
		mockProducer,
	};
});

vi.mock('kafkajs', async () => {
	const actual = await vi.importActual<typeof _kafkajs>('kafkajs');
	return {
		...actual,
		Kafka: vi.fn(function () {
			return {
				producer: () => ({
					connect: mockProducerConnect,
					send: mockProducerSend,
					sendBatch: mockProducerSend,
					disconnect: mockProducerDisconnect,
				}),
			};
		}),
	};
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

function createExecuteFunctions(
	params: IDataObject,
	items: INodeExecutionData[],
	options: {
		schemaRegistryCredential?: IDataObject;
		continueOnFail?: boolean;
	} = {},
) {
	const { schemaRegistryCredential, continueOnFail = false } = options;

	const node = mock<INode>({
		name: 'Kafka',
		// The node reads `getNode().credentials?.schemaRegistryApi` to decide
		// between the credential and the legacy URL parameter path.
		credentials: schemaRegistryCredential
			? { schemaRegistryApi: { id: 'wW0eW1iZK9d3Yz2g', name: 'Schema Registry account' } }
			: undefined,
	});

	return mock<IExecuteFunctions>({
		getInputData: () => items,
		getNode: () => node,
		getNodeParameter: ((name: string, _index: number, fallback?: unknown) =>
			name in params ? params[name] : fallback) as IExecuteFunctions['getNodeParameter'],
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

describe('Kafka Node', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	test('publishes input data as messages with key, headers and options', async () => {
		const params: IDataObject = {
			options: { acks: true, compression: true, timeout: 1000 },
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

		await new Kafka().execute.call(createExecuteFunctions(params, items));

		expect(mockProducerConnect).toHaveBeenCalledTimes(1);
		expect(mockProducerSend).toHaveBeenCalledTimes(1);
		expect(mockProducerSend).toHaveBeenCalledWith({
			acks: 1,
			compression: 1,
			timeout: 1000,
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
	});

	test('publishes schema-registry-encoded messages with json headers', async () => {
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
		const items: INodeExecutionData[] = [{ json: { success: true } }, { json: { success: true } }];

		await new Kafka().execute.call(createExecuteFunctions(params, items));

		// The legacy URL-parameter path stays unauthenticated
		expect(SchemaRegistry).toHaveBeenCalledWith({ host: 'https://test-kafka-registry.local' });
		expect(mockRegistryGetLatestSchemaId).toHaveBeenCalledWith('test-event-name');
		expect(mockRegistryEncode).toHaveBeenCalledWith(1, { foo: 'bar' });

		expect(mockProducerSend).toHaveBeenCalledTimes(1);
		expect(mockProducerSend).toHaveBeenCalledWith({
			acks: 0,
			compression: 0,
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

		await new Kafka().execute.call(
			createExecuteFunctions(params, items, { schemaRegistryCredential }),
		);

		expect(SchemaRegistry).toHaveBeenCalledWith({
			host: 'https://cred-kafka-registry.local',
			auth: { username: 'registry-user', password: 'registry-password' },
		});
		expect(mockProducerSend).toHaveBeenCalledWith(
			expect.objectContaining({
				topicMessages: [
					{
						messages: [
							{
								headers: { headerKey: 'headerValue' },
								key: null,
								value: Buffer.from(JSON.stringify({ foo: 'bar' })),
							},
						],
						topic: 'cred-test-topic',
					},
				],
			}),
		);
	});

	test('should fail with the misconfiguration message when the credential is missing the password', async () => {
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

		await expect(
			new Kafka().execute.call(
				createExecuteFunctions(params, items, {
					schemaRegistryCredential: { ...schemaRegistryCredential, password: '' },
				}),
			),
		).rejects.toThrow('Username and password are required for Schema Registry Basic Auth');

		// Registry misconfiguration surfaces before the producer connects, so no
		// connected producer is ever leaked.
		expect(mockProducerConnect).not.toHaveBeenCalled();
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
			new Kafka().execute.call(createExecuteFunctions(params, items, { schemaRegistryCredential })),
		).rejects.toThrow('Verify your Schema Registry configuration');

		expect(mockProducerConnect).not.toHaveBeenCalled();
	});

	test('should report a malformed message distinctly from a registry config error', async () => {
		const params: IDataObject = {
			options: {},
			sendInputData: false,
			useSchemaRegistry: true,
			message: 'not-json',
			schemaRegistryUrl: '',
			eventName: 'test-event-name',
			topic: 'error-test-topic',
		};
		const items: INodeExecutionData[] = [{ json: {} }];

		await expect(
			new Kafka().execute.call(createExecuteFunctions(params, items, { schemaRegistryCredential })),
		).rejects.toThrow('Message is not valid JSON');

		// The malformed message fails inside the loop, after the producer connected
		// but before any message is published.
		expect(mockProducerConnect).toHaveBeenCalledTimes(1);
		expect(mockProducerSend).not.toHaveBeenCalled();
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

		const result = await new Kafka().execute.call(
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
