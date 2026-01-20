import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import { mock } from 'jest-mock-extended';
import {
	Kafka,
	logLevel,
	type Consumer,
	type ConsumerRunConfig,
	type EachMessageHandler,
	type IHeaders,
	type KafkaMessage,
	type RecordBatchEntry,
} from 'kafkajs';
import { NodeOperationError } from 'n8n-workflow';

import { testTriggerNode } from '@test/nodes/TriggerHelpers';

import { KafkaTrigger } from '../KafkaTrigger.node';

jest.mock('kafkajs');
jest.mock('@kafkajs/confluent-schema-registry');

describe('KafkaTrigger Node', () => {
	let mockKafka: jest.Mocked<Kafka>;
	let mockRegistry: jest.Mocked<SchemaRegistry>;
	let mockConsumerConnect: jest.Mock;
	let mockConsumerSubscribe: jest.Mock;
	let mockConsumerRun: jest.Mock;
	let mockConsumerDisconnect: jest.Mock;
	let mockConsumerCreate: jest.Mock;
	let mockRegistryDecode: jest.Mock;
	let publishMessage: (message: Partial<KafkaMessage>) => Promise<void>;

	beforeEach(() => {
		let mockEachMessage: jest.Mocked<EachMessageHandler> = jest.fn(async () => {});
		mockConsumerConnect = jest.fn();
		mockConsumerSubscribe = jest.fn();
		mockConsumerRun = jest.fn(({ eachMessage }: ConsumerRunConfig) => {
			if (eachMessage) {
				mockEachMessage = eachMessage;
			}
		});
		mockConsumerDisconnect = jest.fn();
		mockConsumerCreate = jest.fn(() =>
			mock<Consumer>({
				connect: mockConsumerConnect,
				subscribe: mockConsumerSubscribe,
				run: mockConsumerRun,
				disconnect: mockConsumerDisconnect,
				on: jest.fn(() => jest.fn()),
				events: {
					CONNECT: 'consumer.connect',
					GROUP_JOIN: 'consumer.group_join',
					REQUEST_TIMEOUT: 'consumer.network.request_timeout',
					RECEIVED_UNSUBSCRIBED_TOPICS: 'consumer.received_unsubscribed_topics',
					STOP: 'consumer.stop',
					DISCONNECT: 'consumer.disconnect',
					COMMIT_OFFSETS: 'consumer.commit_offsets',
					REBALANCING: 'consumer.rebalancing',
					CRASH: 'consumer.crash',
				},
			}),
		);

		publishMessage = async (message: Partial<KafkaMessage>) => {
			await mockEachMessage({
				message: {
					attributes: 1,
					key: Buffer.from('messageKey'),
					offset: '0',
					timestamp: new Date().toISOString(),
					value: Buffer.from('message'),
					headers: {} as IHeaders,
					...message,
				} as RecordBatchEntry,
				partition: 0,
				topic: 'test-topic',
				heartbeat: jest.fn(),
				pause: jest.fn(),
			});
		};

		mockKafka = mock<Kafka>({
			consumer: mockConsumerCreate,
		});

		mockRegistryDecode = jest.fn().mockResolvedValue({ data: 'decoded-data' });
		mockRegistry = mock<SchemaRegistry>({
			decode: mockRegistryDecode,
		});

		(Kafka as jest.Mock).mockReturnValue(mockKafka);
		(SchemaRegistry as jest.Mock).mockReturnValue(mockRegistry);
	});

	it('should connect to Kafka and subscribe to topic', async () => {
		const { close, emit } = await testTriggerNode(KafkaTrigger, {
			mode: 'trigger',
			node: {
				parameters: {
					topic: 'test-topic',
					groupId: 'test-group',
					useSchemaRegistry: false,
					options: {
						fromBeginning: true,
						parallelProcessing: true,
					},
				},
			},
			credential: {
				brokers: 'localhost:9092',
				clientId: 'n8n-kafka',
				ssl: false,
				authentication: false,
			},
		});

		expect(Kafka).toHaveBeenCalledWith({
			clientId: 'n8n-kafka',
			brokers: ['localhost:9092'],
			ssl: false,
			logLevel: logLevel.ERROR,
		});

		expect(mockConsumerCreate).toHaveBeenCalledWith({
			groupId: 'test-group',
			maxInFlightRequests: null,
			sessionTimeout: 30000,
			heartbeatInterval: 3000,
			rebalanceTimeout: 600000,
		});

		expect(mockConsumerConnect).toHaveBeenCalled();
		expect(mockConsumerSubscribe).toHaveBeenCalledWith({
			topic: 'test-topic',
			fromBeginning: true,
		});
		expect(mockConsumerRun).toHaveBeenCalled();

		await publishMessage({
			value: Buffer.from('message'),
		});
		expect(emit).toHaveBeenCalledWith([[{ json: { message: 'message', topic: 'test-topic' } }]]);

		await close();
		expect(mockConsumerDisconnect).toHaveBeenCalled();
	});

	it('should handle authentication when credentials are provided', async () => {
		await testTriggerNode(KafkaTrigger, {
			mode: 'trigger',
			node: {
				parameters: {
					topic: 'test-topic',
					groupId: 'test-group',
					useSchemaRegistry: false,
				},
			},
			credential: {
				brokers: 'localhost:9092',
				clientId: 'n8n-kafka',
				ssl: true,
				authentication: true,
				username: 'test-user',
				password: 'test-password',
				saslMechanism: 'plain',
			},
		});

		expect(Kafka).toHaveBeenCalledWith({
			clientId: 'n8n-kafka',
			brokers: ['localhost:9092'],
			ssl: true,
			logLevel: logLevel.ERROR,
			sasl: {
				username: 'test-user',
				password: 'test-password',
				mechanism: 'plain',
			},
		});
	});

	it('should throw an error if authentication is enabled but credentials are missing', async () => {
		await expect(
			testTriggerNode(KafkaTrigger, {
				mode: 'trigger',
				node: {
					parameters: {
						topic: 'test-topic',
						groupId: 'test-group',
					},
				},
				credential: {
					brokers: 'localhost:9092',
					clientId: 'n8n-kafka',
					ssl: false,
					authentication: true,
				},
			}),
		).rejects.toThrow(NodeOperationError);
	});

	it('should use schema registry when enabled', async () => {
		const { emit } = await testTriggerNode(KafkaTrigger, {
			mode: 'trigger',
			node: {
				parameters: {
					topic: 'test-topic',
					groupId: 'test-group',
					useSchemaRegistry: true,
					schemaRegistryUrl: 'http://localhost:8081',
					options: { parallelProcessing: true },
				},
			},
			credential: {
				brokers: 'localhost:9092',
				clientId: 'n8n-kafka',
				ssl: false,
				authentication: false,
			},
		});

		await publishMessage({
			value: Buffer.from('test-message'),
			headers: { 'content-type': Buffer.from('application/json') },
		});

		expect(SchemaRegistry).toHaveBeenCalledWith({
			host: 'http://localhost:8081',
		});
		expect(mockRegistryDecode).toHaveBeenCalledWith(Buffer.from('test-message'));
		expect(emit).toHaveBeenCalledWith([
			[
				{
					json: {
						message: { data: 'decoded-data' },
						topic: 'test-topic',
					},
				},
			],
		]);
	});

	it('should parse JSON message when jsonParseMessage is true', async () => {
		const { emit } = await testTriggerNode(KafkaTrigger, {
			mode: 'trigger',
			node: {
				parameters: {
					topic: 'test-topic',
					groupId: 'test-group',
					useSchemaRegistry: false,
					options: {
						jsonParseMessage: true,
						parallelProcessing: true,
						onlyMessage: true,
					},
				},
			},
			credential: {
				brokers: 'localhost:9092',
				clientId: 'n8n-kafka',
				ssl: false,
				authentication: false,
			},
		});

		const jsonData = { foo: 'bar' };

		await publishMessage({
			value: Buffer.from(JSON.stringify(jsonData)),
		});

		expect(emit).toHaveBeenCalledWith([[{ json: jsonData }]]);
	});

	it('should include headers when returnHeaders is true', async () => {
		const { emit } = await testTriggerNode(KafkaTrigger, {
			mode: 'trigger',
			node: {
				typeVersion: 1,
				parameters: {
					topic: 'test-topic',
					groupId: 'test-group',
					useSchemaRegistry: false,
					options: {
						returnHeaders: true,
					},
				},
			},
			credential: {
				brokers: 'localhost:9092',
				clientId: 'n8n-kafka',
				ssl: false,
				authentication: false,
			},
		});

		await publishMessage({
			value: Buffer.from('test-message'),
			headers: {
				'content-type': Buffer.from('application/json'),
				'correlation-id': '123456',
				'with-array-value': ['1', '2', '3'],
				empty: undefined,
			},
		});

		expect(emit).toHaveBeenCalledWith([
			[
				{
					json: {
						message: 'test-message',
						topic: 'test-topic',
						headers: {
							'content-type': 'application/json',
							'correlation-id': '123456',
							'with-array-value': '1,2,3',
							empty: '',
						},
					},
				},
			],
		]);
	});

	it('should handle manual trigger mode', async () => {
		const { emit, manualTriggerFunction } = await testTriggerNode(KafkaTrigger, {
			mode: 'manual',
			node: {
				parameters: {
					topic: 'test-topic',
					groupId: 'test-group',
					useSchemaRegistry: false,
					options: {
						parallelProcessing: true,
					},
				},
			},
			credential: {
				brokers: 'localhost:9092',
				clientId: 'n8n-kafka',
				ssl: false,
				authentication: false,
			},
		});

		await manualTriggerFunction?.();

		expect(mockConsumerConnect).toHaveBeenCalledTimes(1);
		expect(mockConsumerSubscribe).toHaveBeenCalledTimes(1);
		expect(mockConsumerRun).toHaveBeenCalledTimes(1);

		expect(emit).not.toHaveBeenCalled();

		await publishMessage({ value: Buffer.from('test') });

		expect(emit).toHaveBeenCalledWith([[{ json: { message: 'test', topic: 'test-topic' } }]]);
	});

	it('should handle sequential processing when parallelProcessing is false', async () => {
		const { emit } = await testTriggerNode(KafkaTrigger, {
			mode: 'trigger',
			node: {
				parameters: {
					topic: 'test-topic',
					groupId: 'test-group',
					useSchemaRegistry: false,
					options: {
						parallelProcessing: false,
					},
				},
			},
			credential: {
				brokers: 'localhost:9092',
				clientId: 'n8n-kafka',
				ssl: false,
				authentication: false,
			},
		});

		const publishPromise = publishMessage({
			value: Buffer.from('test-message'),
		});

		expect(emit).toHaveBeenCalled();

		const deferredPromise = emit.mock.calls[0][2];
		expect(deferredPromise).toBeDefined();

		deferredPromise?.resolve(mock());
		await publishPromise;
	});

	it('should use custom rebalanceTimeout when provided', async () => {
		await testTriggerNode(KafkaTrigger, {
			mode: 'trigger',
			node: {
				parameters: {
					topic: 'test-topic',
					groupId: 'test-group',
					useSchemaRegistry: false,
					options: {
						rebalanceTimeout: 300000,
						sessionTimeout: 20000,
						heartbeatInterval: 2000,
					},
				},
			},
			credential: {
				brokers: 'localhost:9092',
				clientId: 'n8n-kafka',
				ssl: false,
				authentication: false,
			},
		});

		expect(mockConsumerCreate).toHaveBeenCalledWith({
			groupId: 'test-group',
			maxInFlightRequests: null,
			sessionTimeout: 20000,
			heartbeatInterval: 2000,
			rebalanceTimeout: 300000,
		});
	});

	it('should register event listeners on consumer', async () => {
		const mockOn = jest.fn(() => jest.fn());
		mockConsumerCreate.mockReturnValueOnce(
			mock<Consumer>({
				connect: mockConsumerConnect,
				subscribe: mockConsumerSubscribe,
				run: mockConsumerRun,
				disconnect: mockConsumerDisconnect,
				on: mockOn,
				events: {
					CONNECT: 'consumer.connect',
					GROUP_JOIN: 'consumer.group_join',
					REQUEST_TIMEOUT: 'consumer.network.request_timeout',
					RECEIVED_UNSUBSCRIBED_TOPICS: 'consumer.received_unsubscribed_topics',
					STOP: 'consumer.stop',
					DISCONNECT: 'consumer.disconnect',
					COMMIT_OFFSETS: 'consumer.commit_offsets',
					REBALANCING: 'consumer.rebalancing',
					CRASH: 'consumer.crash',
				},
			}),
		);

		await testTriggerNode(KafkaTrigger, {
			mode: 'trigger',
			node: {
				parameters: {
					topic: 'test-topic',
					groupId: 'test-group',
					useSchemaRegistry: false,
				},
			},
			credential: {
				brokers: 'localhost:9092',
				clientId: 'n8n-kafka',
				ssl: false,
				authentication: false,
			},
		});

		// Verify all event listeners are registered
		expect(mockOn).toHaveBeenCalledTimes(9);
		expect(mockOn).toHaveBeenCalledWith('consumer.connect', expect.any(Function));
		expect(mockOn).toHaveBeenCalledWith('consumer.group_join', expect.any(Function));
		expect(mockOn).toHaveBeenCalledWith('consumer.network.request_timeout', expect.any(Function));
		expect(mockOn).toHaveBeenCalledWith(
			'consumer.received_unsubscribed_topics',
			expect.any(Function),
		);
		expect(mockOn).toHaveBeenCalledWith('consumer.stop', expect.any(Function));
		expect(mockOn).toHaveBeenCalledWith('consumer.disconnect', expect.any(Function));
		expect(mockOn).toHaveBeenCalledWith('consumer.commit_offsets', expect.any(Function));
		expect(mockOn).toHaveBeenCalledWith('consumer.rebalancing', expect.any(Function));
		expect(mockOn).toHaveBeenCalledWith('consumer.crash', expect.any(Function));
	});

	it('should clean up event listeners on close', async () => {
		const mockRemoveListener1 = jest.fn();
		const mockRemoveListener2 = jest.fn();
		const mockRemoveListener3 = jest.fn();
		const mockRemoveListener4 = jest.fn();
		const mockRemoveListener5 = jest.fn();
		const mockRemoveListener6 = jest.fn();
		const mockRemoveListener7 = jest.fn();
		const mockRemoveListener8 = jest.fn();
		const mockRemoveListener9 = jest.fn();

		const mockOn = jest
			.fn()
			.mockReturnValueOnce(mockRemoveListener1)
			.mockReturnValueOnce(mockRemoveListener2)
			.mockReturnValueOnce(mockRemoveListener3)
			.mockReturnValueOnce(mockRemoveListener4)
			.mockReturnValueOnce(mockRemoveListener5)
			.mockReturnValueOnce(mockRemoveListener6)
			.mockReturnValueOnce(mockRemoveListener7)
			.mockReturnValueOnce(mockRemoveListener8)
			.mockReturnValueOnce(mockRemoveListener9);

		const mockConsumerStop = jest.fn();

		mockConsumerCreate.mockReturnValueOnce(
			mock<Consumer>({
				connect: mockConsumerConnect,
				subscribe: mockConsumerSubscribe,
				run: mockConsumerRun,
				disconnect: mockConsumerDisconnect,
				stop: mockConsumerStop,
				on: mockOn,
				events: {
					CONNECT: 'consumer.connect',
					GROUP_JOIN: 'consumer.group_join',
					REQUEST_TIMEOUT: 'consumer.network.request_timeout',
					RECEIVED_UNSUBSCRIBED_TOPICS: 'consumer.received_unsubscribed_topics',
					STOP: 'consumer.stop',
					DISCONNECT: 'consumer.disconnect',
					COMMIT_OFFSETS: 'consumer.commit_offsets',
					REBALANCING: 'consumer.rebalancing',
					CRASH: 'consumer.crash',
				},
			}),
		);

		const { close } = await testTriggerNode(KafkaTrigger, {
			mode: 'trigger',
			node: {
				parameters: {
					topic: 'test-topic',
					groupId: 'test-group',
					useSchemaRegistry: false,
				},
			},
			credential: {
				brokers: 'localhost:9092',
				clientId: 'n8n-kafka',
				ssl: false,
				authentication: false,
			},
		});

		await close();

		// Verify all event listener removal functions were called
		expect(mockRemoveListener1).toHaveBeenCalled();
		expect(mockRemoveListener2).toHaveBeenCalled();
		expect(mockRemoveListener3).toHaveBeenCalled();
		expect(mockRemoveListener4).toHaveBeenCalled();
		expect(mockRemoveListener5).toHaveBeenCalled();
		expect(mockRemoveListener6).toHaveBeenCalled();
		expect(mockRemoveListener7).toHaveBeenCalled();
		expect(mockRemoveListener8).toHaveBeenCalled();
		expect(mockRemoveListener9).toHaveBeenCalled();

		// Verify consumer was stopped and disconnected
		expect(mockConsumerStop).toHaveBeenCalled();
		expect(mockConsumerDisconnect).toHaveBeenCalled();
	});

	it('should use default values for consumer config when options are not provided', async () => {
		await testTriggerNode(KafkaTrigger, {
			mode: 'trigger',
			node: {
				parameters: {
					topic: 'test-topic',
					groupId: 'test-group',
					useSchemaRegistry: false,
				},
			},
			credential: {
				brokers: 'localhost:9092',
				clientId: 'n8n-kafka',
				ssl: false,
				authentication: false,
			},
		});

		expect(mockConsumerCreate).toHaveBeenCalledWith({
			groupId: 'test-group',
			maxInFlightRequests: null,
			sessionTimeout: 30000,
			heartbeatInterval: 3000,
			rebalanceTimeout: 600000,
		});
	});
});
