import { mock } from 'vitest-mock-extended';
import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import { Kafka } from '../Kafka.node';

import type * as _kafkajs from 'kafkajs';

// The node is imported directly (through vite) here rather than via NodeTestHarness, so vi.mock
// intercepts its `kafkajs` / `@kafkajs/confluent-schema-registry` imports. (The harness loads
// nodes from dist via require(), where vi.mock can't reach them and kafkajs' namespace can't be
// spied.) importActual keeps the real `CompressionTypes` enum the node relies on.
const { mockProducerSend, mockKafka, mockRegistry } = vi.hoisted(() => {
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

describe('Kafka Node', () => {
	beforeEach(() => {
		mockProducerSend.mockClear();
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
});
