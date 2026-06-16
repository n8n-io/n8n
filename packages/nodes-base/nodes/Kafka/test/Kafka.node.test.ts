import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { Kafka as apacheKafka } from 'kafkajs';
import type { Producer } from 'kafkajs';
import type * as _kafkajs from 'kafkajs';
import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	OnError,
	WorkflowTestData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import type { Mock, Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { Kafka } from '../Kafka.node';

// The node is imported directly (through vite) here rather than via NodeTestHarness, so vi.mock
// intercepts its `kafkajs` / `@kafkajs/confluent-schema-registry` imports. (The harness loads
// nodes from dist via require(), where vi.mock can't reach them and kafkajs' namespace can't be
// spied.) importActual keeps the real `CompressionTypes` enum the node relies on.
const { mockKafka, mockRegistry } = vi.hoisted(() => {
	const mockProducerSend = vi.fn(async () => [] as unknown[]);
	const mockProducer = {
		connect: vi.fn(),
		send: mockProducerSend,
		sendBatch: mockProducerSend,
		disconnect: vi.fn(),
	};
	return {
		mockProducerSend,
		mockKafka: { producer: () => mockProducer },
		mockRegistry: {
			getLatestSchemaId: vi.fn(async () => 1),
			encode: vi.fn(async (_id: number, input: unknown) => Buffer.from(JSON.stringify(input))),
		},
	};
});

vi.mock('kafkajs', async () => {
	const actual = await vi.importActual<typeof _kafkajs>('kafkajs');
	return {
		...actual,
		Kafka: vi.fn(function () {
			return mockKafka;
		}),
	};
});

vi.mock('@kafkajs/confluent-schema-registry', () => ({
	SchemaRegistry: vi.fn(function () {
		return mockRegistry;
	}),
}));

function createExecuteFunctions(params: IDataObject, items: INodeExecutionData[]) {
	return mock<IExecuteFunctions>({
		getInputData: () => items,
		getNodeParameter: ((name: string, _index: number, fallback?: unknown) =>
			name in params ? params[name] : fallback) as IExecuteFunctions['getNodeParameter'],
		getCredentials: vi.fn().mockResolvedValue({
			brokers: 'localhost:9092',
			clientId: 'test-client',
			ssl: false,
			authentication: false,
		}),
		continueOnFail: () => false,
		helpers: {
			returnJsonArray: (data: IDataObject | IDataObject[]) =>
				(Array.isArray(data) ? data : [data]).map((json) => ({ json })),
		} as unknown as IExecuteFunctions['helpers'],
	});
}

const errorWorkflow = (
	eventName: string,
	message = '{"foo":"bar"}',
	onError?: OnError,
): WorkflowTestData['input']['workflowData'] => ({
	nodes: [
		{
			parameters: {},
			id: 'b1dcfb89-3dda-4d18-bdd6-c12d8dee70d2',
			name: 'When clicking ‘Execute workflow’',
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [0, 0],
		},
		{
			parameters: {
				topic: 'error-test-topic',
				sendInputData: false,
				message,
				useSchemaRegistry: true,
				schemaRegistryUrl: '',
				eventName,
				options: {},
			},
			id: '49emc1d5-4d18-4f9b-a2cd-7e2f871a23ed',
			name: 'Schema Registry Error',
			type: 'n8n-nodes-base.kafka',
			typeVersion: 1,
			position: [220, 0],
			...(onError ? { onError } : {}),
			credentials: {
				kafka: { id: 'JJBjHkOrIfcj91EX', name: 'Kafka account' },
				schemaRegistryApi: { id: 'wW0eW1iZK9d3Yz2g', name: 'Schema Registry account' },
			},
		},
	],
	connections: {
		'When clicking ‘Execute workflow’': {
			main: [
				[
					{
						node: 'Schema Registry Error',
						type: NodeConnectionTypes.Main,
						index: 0,
					},
				],
			],
		},
	},
});

describe('Kafka Node', () => {
	let mockProducer: Mocked<Producer>;
	let mockKafka: Mocked<apacheKafka>;
	let mockRegistry: Mocked<SchemaRegistry>;
	let mockProducerConnect: Mock;
	let mockProducerSend: Mock;
	let mockProducerDisconnect: Mock;
	let mockRegistryEncode: Mock;
	let mockRegistryGetLatestSchemaId: Mock;

	beforeEach(() => {
		mockProducerSend.mockClear();
	});

	beforeAll(() => {
		mockProducerConnect = vi.fn();
		mockProducerSend = vi.fn().mockImplementation(async () => []);
		mockProducerDisconnect = vi.fn();

		mockProducer = mock<Producer>({
			connect: mockProducerConnect,
			send: mockProducerSend,
			sendBatch: mockProducerSend,
			disconnect: mockProducerDisconnect,
		});

		mockKafka = mock<apacheKafka>({
			producer: vi.fn().mockReturnValue(mockProducer),
		});

		mockRegistryEncode = vi.fn((_id, input) => Buffer.from(JSON.stringify(input)));
		mockRegistryGetLatestSchemaId = vi.fn(async (eventName: string) => {
			if (eventName === 'failing-event-name') {
				throw new Error('Subject not found');
			}
			return 1;
		});
		mockRegistry = mock<SchemaRegistry>({
			encode: mockRegistryEncode,
			getLatestSchemaId: mockRegistryGetLatestSchemaId,
		});

		(apacheKafka as Mock).mockReturnValue(mockKafka);
		(SchemaRegistry as Mock).mockReturnValue(mockRegistry);
	});

	const harness = new NodeTestHarness();
	const schemaRegistryCredential = {
		url: 'https://cred-kafka-registry.local',
		authentication: 'basicAuth',
		username: 'registry-user',
		password: 'registry-password',
	};

	harness.setupTests({
		credentials: { schemaRegistryApi: schemaRegistryCredential },
	});

	harness.setupTest({
		description:
			'should fail with the misconfiguration message when the credential is missing the password',
		input: { workflowData: errorWorkflow('test-event-name') },
		output: {
			nodeData: {},
			error: 'Username and password are required for Schema Registry Basic Auth',
		},
		credentials: {
			schemaRegistryApi: { ...schemaRegistryCredential, password: '' },
		},
	});

	harness.setupTest({
		description: 'should fail with the generic message when the schema lookup fails',
		input: { workflowData: errorWorkflow('failing-event-name') },
		output: {
			nodeData: {},
			error: 'Verify your Schema Registry configuration',
		},
		credentials: {
			schemaRegistryApi: schemaRegistryCredential,
		},
	});

	harness.setupTest({
		description: 'should report a malformed message distinctly from a registry config error',
		input: { workflowData: errorWorkflow('test-event-name', 'not-json') },
		output: {
			nodeData: {},
			error: 'Message is not valid JSON',
		},
		credentials: {
			schemaRegistryApi: schemaRegistryCredential,
		},
	});

	harness.setupTest({
		description: 'should return the error as item data when the node continues on fail',
		input: {
			workflowData: errorWorkflow('test-event-name', '{"foo":"bar"}', 'continueRegularOutput'),
		},
		output: {
			nodeData: {
				'Schema Registry Error': [
					[{ error: 'Username and password are required for Schema Registry Basic Auth' }],
				],
			},
		},
		credentials: {
			schemaRegistryApi: { ...schemaRegistryCredential, password: '' },
		},
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

		expect(mockProducerSend).toHaveBeenCalledTimes(1);
	});

	test('should only connect the producer once the schema registry is resolved', async () => {
		// Cumulative count across all the workflows above: 3 node executions from
		// the two successful workflows, plus 1 from the encode-failure workflow
		// (encoding fails inside the loop, after the producer has connected).
		// The two registry-resolution error workflows (missing password, failing
		// schema lookup) must NOT contribute: registry misconfiguration surfaces
		// before `producer.connect()`, so no connected producer is ever leaked.
		expect(mockProducerConnect).toHaveBeenCalledTimes(4);
	});

	test('should publish the correct kafka messages', async () => {
		expect(mockProducerSend).toHaveBeenCalledTimes(3);
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
		expect(SchemaRegistry).toHaveBeenCalledWith({
			host: 'https://cred-kafka-registry.local',
			auth: { username: 'registry-user', password: 'registry-password' },
		});
		// The legacy URL-parameter path stays unauthenticated
		expect(SchemaRegistry).toHaveBeenCalledWith({ host: 'https://test-kafka-registry.local' });

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

	test('should resolve the schema id from the configured event name and encode with it', async () => {
		// Exercised by the credential success path (workflow.credentials.json):
		// eventName 'test-event-name' resolves to schemaId 1, used to encode the payload.
		expect(mockRegistryGetLatestSchemaId).toHaveBeenCalledWith('test-event-name');
		expect(mockRegistryEncode).toHaveBeenCalledWith(1, { foo: 'bar' });
	});
});
