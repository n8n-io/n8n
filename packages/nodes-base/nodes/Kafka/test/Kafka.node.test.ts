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

	let schemaRegistryConstructorArgs: any[] = [];

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
		mockRegistry = mock<SchemaRegistry>({
			encode: mockRegistryEncode,
		});

		(apacheKafka as jest.Mock).mockReturnValue(mockKafka);

		(SchemaRegistry as jest.Mock).mockImplementation((...args: any[]) => {
			schemaRegistryConstructorArgs.push(args[0]);
			return mockRegistry;
		});
	});

	afterEach(() => {
		schemaRegistryConstructorArgs = [];
	});

	new NodeTestHarness().setupTests();

	test('should publish the correct kafka messages', async () => {
		expect(mockProducerSend).toHaveBeenCalledTimes(2);
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

	test('should instantiate SchemaRegistry with auth when username and password are provided', async () => {
		const params = {
			useSchemaRegistry: true,
			schemaRegistryUrl: 'https://registry-url',
			schemaRegistryUsername: 'user',
			schemaRegistryPassword: 'pass',
			eventName: 'namespace.name',
		};
		new SchemaRegistry({
			host: params.schemaRegistryUrl,
			auth: {
				username: params.schemaRegistryUsername,
				password: params.schemaRegistryPassword,
			},
		});
		expect(
			schemaRegistryConstructorArgs.some(
				(arg) =>
					arg.host === params.schemaRegistryUrl &&
					arg.auth &&
					arg.auth.username === params.schemaRegistryUsername &&
					arg.auth.password === params.schemaRegistryPassword,
			),
		).toBe(true);
	});

	test('should instantiate SchemaRegistry without auth when username or password is missing', async () => {
		const params = {
			useSchemaRegistry: true,
			schemaRegistryUrl: 'https://registry-url',
			schemaRegistryUsername: '',
			schemaRegistryPassword: '',
			eventName: 'namespace.name',
		};
		new SchemaRegistry({
			host: params.schemaRegistryUrl,
		});
		expect(
			schemaRegistryConstructorArgs.some(
				(arg) => arg.host === params.schemaRegistryUrl && !arg.auth,
			),
		).toBe(true);
	});

	test('should instantiate SchemaRegistry without auth when username and password are not provided', async () => {
		const params = {
			useSchemaRegistry: true,
			schemaRegistryUrl: 'https://registry-url',
			// username and password not set
			eventName: 'namespace.name',
		};
		new SchemaRegistry({
			host: params.schemaRegistryUrl,
		});
		expect(
			schemaRegistryConstructorArgs.some(
				(arg) => arg.host === params.schemaRegistryUrl && !arg.auth,
			),
		).toBe(true);
	});
});
