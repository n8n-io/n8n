import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { mock } from 'jest-mock-extended';
import type { Producer } from 'kafkajs';
import { Kafka as apacheKafka } from 'kafkajs';

jest.mock('kafkajs');
jest.mock('@kafkajs/confluent-schema-registry');

describe('Kafka Node', () => {
	let mockProducer: jest.Mocked<Producer>;
	let mockKafka: jest.Mocked<apacheKafka>;
	let mockRegistry: jest.Mocked<SchemaRegistry>;
	let mockProducerConnect: jest.Mock;
	let mockProducerSend: jest.Mock;
	let mockProducerDisconnect: jest.Mock;
	let mockRegistryEncode: jest.Mock;
	let mockRegistryGetLatestSchemaId: jest.Mock;

	beforeAll(() => {
		mockProducerConnect = jest.fn();
		mockProducerSend = jest.fn().mockImplementation(async () => []);
		mockProducerDisconnect = jest.fn();

		mockProducer = mock<Producer>({
			connect: mockProducerConnect,
			send: mockProducerSend,
			sendBatch: mockProducerSend,
			disconnect: mockProducerDisconnect,
		});

		mockKafka = mock<apacheKafka>({
			producer: jest.fn().mockReturnValue(mockProducer),
		});

		mockRegistryEncode = jest.fn((_id, input) => Buffer.from(JSON.stringify(input)));
		mockRegistryGetLatestSchemaId = jest.fn(() => 1);
		mockRegistry = mock<SchemaRegistry>({
			encode: mockRegistryEncode,
			getLatestSchemaId: mockRegistryGetLatestSchemaId,
		});

		(apacheKafka as jest.Mock).mockReturnValue(mockKafka);
		(SchemaRegistry as jest.Mock).mockReturnValue(mockRegistry);
	});

	new NodeTestHarness().setupTests();

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

	test('should instantiate SchemaRegistry with correct options', () => {
		expect(SchemaRegistry).toHaveBeenCalledTimes(4);
		expect(SchemaRegistry).toHaveBeenNthCalledWith(1, {
			host: 'https://test-kafka-registry.local',
		});

		expect(SchemaRegistry).toHaveBeenNthCalledWith(2, {
			host: 'https://test-kafka-registry.local',
		});
		expect(SchemaRegistry).toHaveBeenNthCalledWith(3, {
			auth: {
				username: 'abc',
				password: 'supersecretkey',
			},
			host: 'https://test-kafka-registry.local',
		});
		expect(SchemaRegistry).toHaveBeenNthCalledWith(4, {
			auth: {
				username: 'abc',
				password: 'supersecretkey',
			},
			host: 'https://test-kafka-registry.local',
		});
	});

	test('should get latest schema ID from SchemaRegistry', () => {
		expect(mockRegistryGetLatestSchemaId).toHaveBeenCalledTimes(4);
		expect(mockRegistryGetLatestSchemaId).toHaveBeenNthCalledWith(1, 'test-event-name');
		expect(mockRegistryGetLatestSchemaId).toHaveBeenNthCalledWith(2, 'test-event-name');
		expect(mockRegistryGetLatestSchemaId).toHaveBeenNthCalledWith(3, 'test-event-name');
		expect(mockRegistryGetLatestSchemaId).toHaveBeenNthCalledWith(4, 'test-event-name');
	});

	test('should encode messages with SchemaRegistry', () => {
		expect(mockRegistryEncode).toHaveBeenCalledTimes(4);
		expect(mockRegistryEncode).toHaveBeenNthCalledWith(1, 1, { foo: 'bar' });
		expect(mockRegistryEncode).toHaveBeenNthCalledWith(2, 1, { foo: 'bar' });
		expect(mockRegistryEncode).toHaveBeenNthCalledWith(3, 1, { foo: 'bar' });
		expect(mockRegistryEncode).toHaveBeenNthCalledWith(4, 1, { foo: 'bar' });
	});
});
