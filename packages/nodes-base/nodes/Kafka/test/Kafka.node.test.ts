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
		(SchemaRegistry as jest.Mock).mockReturnValue(mockRegistry);
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
});

describe('Kafka Node Authentication', () => {
	let mockProducer: jest.Mocked<Producer>;
	let mockKafka: jest.Mocked<apacheKafka>;
	let mockProducerConnect: jest.Mock;
	let mockProducerSend: jest.Mock;
	let mockProducerDisconnect: jest.Mock;

	beforeEach(() => {
		mockProducerConnect = jest.fn();
		mockProducerSend = jest.fn().mockResolvedValue([{ topicName: 'test-topic', partition: 0 }]);
		mockProducerDisconnect = jest.fn();

		mockProducer = mock<Producer>({
			connect: mockProducerConnect,
			send: mockProducerSend,
			sendBatch: mockProducerSend,
			disconnect: mockProducerDisconnect,
		});

		mockKafka = mock<apacheKafka>({
			producer: jest.fn().mockReturnValue(mockProducer),
			admin: jest.fn().mockReturnValue({
				connect: jest.fn(),
				disconnect: jest.fn(),
			}),
		});

		(apacheKafka as unknown as jest.Mock).mockReturnValue(mockKafka);

		(SchemaRegistry as unknown as jest.Mock).mockImplementation(() => ({
			encode: jest.fn((_id, input) => Buffer.from(JSON.stringify(input))),
			getLatestSchemaId: jest.fn().mockResolvedValue(1),
		}));
	});

	new NodeTestHarness().setupTests();

	test('should authenticate using legacy credentials (no authMode)', async () => {
		const credentials = {
			brokers: 'localhost:9092',
			clientId: 'test-client',
			ssl: false,
			authentication: true,
			username: 'user',
			password: 'pass',
			saslMechanism: 'plain',
		};

		const kafkaNode = new (require('../Kafka').Kafka)();

		const result = await kafkaNode.methods.credentialTest.kafkaConnectionTest.call(
			{ helpers: {} } as any,
			{ data: credentials },
		);

		expect(result.status).toBe('OK');
		expect(apacheKafka).toHaveBeenCalledWith(
			expect.objectContaining({
				sasl: expect.objectContaining({
					username: 'user',
					password: 'pass',
					mechanism: 'plain',
				}),
			}),
		);
	});

	test('should authenticate using userpass authMode', async () => {
		const credentials = {
			brokers: 'localhost:9092',
			clientId: 'test-client',
			ssl: false,
			authentication: true,
			authMode: 'userpass',
			username: 'user',
			password: 'pass',
			saslMechanism: 'scram-sha-512',
		};

		const kafkaNode = new (require('../Kafka').Kafka)();

		const result = await kafkaNode.methods.credentialTest.kafkaConnectionTest.call(
			{ helpers: {} } as any,
			{ data: credentials },
		);

		expect(result.status).toBe('OK');
		expect(apacheKafka).toHaveBeenCalledWith(
			expect.objectContaining({
				sasl: expect.objectContaining({
					username: 'user',
					password: 'pass',
					mechanism: 'scram-sha-512',
				}),
			}),
		);
	});

	test('should authenticate using awsIam authMode', async () => {
		const credentials = {
			brokers: 'localhost:9092',
			clientId: 'test-client',
			ssl: false,
			authentication: true,
			authMode: 'awsIam',
			awsRegion: 'us-east-1',
			accessKeyId: 'AKIAEXAMPLE',
			secretAccessKey: 'SECRETEXAMPLE',
		};

		const kafkaNode = new (require('../Kafka').Kafka)();

		const result = await kafkaNode.methods.credentialTest.kafkaConnectionTest.call(
			{ helpers: {} } as any,
			{ data: credentials },
		);

		expect(result.status).toBe('OK');
		expect(apacheKafka).toHaveBeenCalledWith(
			expect.objectContaining({
				ssl: true,
				sasl: expect.objectContaining({
					mechanism: 'aws',
					authenticationProvider: expect.any(Function),
				}),
			}),
		);
		expect(mskIamAuthProvider).toHaveBeenCalled();
	});

	test('should throw warning if username/password missing for userpass', async () => {
		const credentials = {
			brokers: 'localhost:9092',
			clientId: 'test-client',
			ssl: false,
			authentication: true,
			authMode: 'userpass',
			username: '',
			password: '',
			saslMechanism: 'plain',
		};

		const kafkaNode = new (require('../Kafka').Kafka)();

		await expect(
			kafkaNode.methods.credentialTest.kafkaConnectionTest.call({ helpers: {} } as any, {
				data: credentials,
			}),
		).rejects.toThrow(ApplicationError);
	});
});
