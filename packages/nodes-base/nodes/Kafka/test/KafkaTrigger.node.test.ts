import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import { mock } from 'jest-mock-extended';
import {
	Kafka,
	logLevel,
	type Consumer,
	type ConsumerRunConfig,
	type EachBatchHandler,
	type EachMessageHandler,
	type IHeaders,
	type KafkaMessage,
	type RecordBatchEntry,
} from 'kafkajs';
import { NodeOperationError, type IRun } from 'n8n-workflow';

import { testTriggerNode } from '@test/nodes/TriggerHelpers';

import { KafkaTrigger } from '../KafkaTrigger.node';

jest.mock('kafkajs');
jest.mock('@kafkajs/confluent-schema-registry');
jest.mock('n8n-workflow', () => {
	const actual = jest.requireActual('n8n-workflow');
	return {
		...actual,
		sleep: jest.fn().mockResolvedValue(undefined),
	};
});

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
		const mockEachMessageHolder = {
			handler: jest.fn(async () => {}) as jest.Mocked<EachMessageHandler>,
		};
		const mockEachBatchHolder = {
			handler: jest.fn(async () => {}) as jest.Mocked<EachBatchHandler>,
		};
		mockConsumerConnect = jest.fn();
		mockConsumerSubscribe = jest.fn();
		mockConsumerRun = jest.fn(({ eachMessage, eachBatch }: ConsumerRunConfig) => {
			if (eachMessage) {
				mockEachMessageHolder.handler = eachMessage;
			}
			if (eachBatch) {
				mockEachBatchHolder.handler = eachBatch;
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

		// Helper to publish a single message using eachBatch (since we now always use eachBatch)
		publishMessage = async (message: Partial<KafkaMessage>) => {
			await mockEachBatchHolder.handler({
				batch: {
					topic: 'test-topic',
					partition: 0,
					highWatermark: '100',
					messages: [
						{
							attributes: 1,
							key: Buffer.from('messageKey'),
							offset: '0',
							timestamp: new Date().toISOString(),
							value: Buffer.from('message'),
							headers: {} as IHeaders,
							...message,
						},
					] as RecordBatchEntry[],
					isEmpty: () => false,
					firstOffset: () => '0',
					lastOffset: () => '0',
					offsetLag: () => '0',
					offsetLagLow: () => '0',
				},
				resolveOffset: jest.fn(),
				heartbeat: jest.fn(),
				commitOffsetsIfNecessary: jest.fn(),
				uncommittedOffsets: jest.fn(),
				isRunning: jest.fn(() => true),
				isStale: jest.fn(() => false),
				pause: jest.fn(),
			});
		};

		const publishBatch = async (messages: Array<Partial<KafkaMessage>>) => {
			await mockEachBatchHolder.handler({
				batch: {
					topic: 'test-topic',
					partition: 0,
					highWatermark: '100',
					messages: messages.map((msg, index) => ({
						attributes: 1,
						key: Buffer.from('messageKey'),
						offset: String(index),
						timestamp: new Date().toISOString(),
						value: Buffer.from('message'),
						headers: {} as IHeaders,
						...msg,
					})) as RecordBatchEntry[],
					isEmpty: () => false,
					firstOffset: () => '0',
					lastOffset: () => String(messages.length - 1),
					offsetLag: () => '0',
					offsetLagLow: () => '0',
				},
				resolveOffset: jest.fn(),
				heartbeat: jest.fn(),
				commitOffsetsIfNecessary: jest.fn(),
				uncommittedOffsets: jest.fn(),
				isRunning: jest.fn(() => true),
				isStale: jest.fn(() => false),
				pause: jest.fn(),
			});
		};

		// Expose publishBatch for tests that need it
		(global as any).publishBatch = publishBatch;

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
				typeVersion: 1,
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
				typeVersion: 1,
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

	it('should use immediate emit in manual mode even when resolveOffset is onCompletion (v1.3)', async () => {
		const { emit, manualTriggerFunction } = await testTriggerNode(KafkaTrigger, {
			mode: 'manual',
			node: {
				typeVersion: 1.3,
				parameters: {
					topic: 'test-topic',
					groupId: 'test-group',
					useSchemaRegistry: false,
					resolveOffset: 'onCompletion',
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

		await publishMessage({ value: Buffer.from('test-message') });

		expect(emit).toHaveBeenCalledWith([
			[{ json: { message: 'test-message', topic: 'test-topic' } }],
		]);
		expect(emit.mock.calls[0][2]).toBeUndefined();
	});

	it('should use immediate emit in manual mode even when parallelProcessing is false (v1.1)', async () => {
		const { emit, manualTriggerFunction } = await testTriggerNode(KafkaTrigger, {
			mode: 'manual',
			node: {
				typeVersion: 1.1,
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

		await manualTriggerFunction?.();

		await publishMessage({ value: Buffer.from('test-message') });

		expect(emit).toHaveBeenCalledWith([
			[{ json: { message: 'test-message', topic: 'test-topic' } }],
		]);
		expect(emit.mock.calls[0][2]).toBeUndefined();
	});

	it('should handle sequential processing when parallelProcessing is false', async () => {
		const { emit } = await testTriggerNode(KafkaTrigger, {
			mode: 'trigger',
			node: {
				typeVersion: 1.1,
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

		// Wait for the async message handler to execute
		await new Promise((resolve) => setImmediate(resolve));

		expect(emit).toHaveBeenCalled();

		const deferredPromise = emit.mock.calls[0][2];
		expect(deferredPromise).toBeDefined();

		deferredPromise?.resolve(mock());
		await publishPromise;
	});

	it('should keep binary data when keepBinaryData is enabled in v1.2', async () => {
		const messageBuffer = Buffer.from('binary-avro-data');

		const { emit } = await testTriggerNode(KafkaTrigger, {
			mode: 'trigger',
			node: {
				typeVersion: 1.2,
				parameters: {
					topic: 'test-topic',
					groupId: 'test-group',
					useSchemaRegistry: false,
					options: {
						keepBinaryData: true,
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

		await publishMessage({
			value: messageBuffer,
		});

		// Verify that emit was called with binary data structure
		expect(emit).toHaveBeenCalled();
		const emittedData = emit.mock.calls[0][0][0][0]; // [callIndex][argumentIndex][arrayIndex][itemIndex]

		// Check the structure has both json and binary properties
		expect(emittedData).toHaveProperty('json');
		expect(emittedData).toHaveProperty('binary');
		// Message is converted to string for the json field
		expect(emittedData.json.message).toBe('binary-avro-data');
		expect(emittedData.json.topic).toBe('test-topic');
		// Raw buffer is preserved in binary data for downstream processing
		expect(emittedData.binary).toHaveProperty('data');
	});

	it('should not keep binary data in v1.0 and v1.1 even if option is set', async () => {
		const { emit } = await testTriggerNode(KafkaTrigger, {
			mode: 'trigger',
			node: {
				typeVersion: 1.1,
				parameters: {
					topic: 'test-topic',
					groupId: 'test-group',
					useSchemaRegistry: false,
					options: {
						keepBinaryData: true,
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

		await publishMessage({
			value: Buffer.from('test-message'),
		});

		// Should emit as string, not binary data
		expect(emit).toHaveBeenCalledWith([
			[
				{
					json: {
						message: 'test-message',
						topic: 'test-topic',
					},
				},
			],
		]);
	});

	it('should convert to string when keepBinaryData is false in v1.2', async () => {
		const { emit } = await testTriggerNode(KafkaTrigger, {
			mode: 'trigger',
			node: {
				typeVersion: 1.2,
				parameters: {
					topic: 'test-topic',
					groupId: 'test-group',
					useSchemaRegistry: false,
					options: {
						keepBinaryData: false,
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

		await publishMessage({
			value: Buffer.from('test-message'),
		});

		expect(emit).toHaveBeenCalledWith([
			[
				{
					json: {
						message: 'test-message',
						topic: 'test-topic',
					},
				},
			],
		]);
	});

	it('should parse JSON and keep binary data when both options are enabled', async () => {
		const jsonData = { foo: 'bar', nested: { value: 123 } };
		const messageBuffer = Buffer.from(JSON.stringify(jsonData));

		const { emit } = await testTriggerNode(KafkaTrigger, {
			mode: 'trigger',
			node: {
				typeVersion: 1.2,
				parameters: {
					topic: 'test-topic',
					groupId: 'test-group',
					useSchemaRegistry: false,
					options: {
						keepBinaryData: true,
						jsonParseMessage: true,
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

		await publishMessage({
			value: messageBuffer,
		});

		expect(emit).toHaveBeenCalled();
		const emittedData = emit.mock.calls[0][0][0][0];

		// Should have parsed JSON in the message field
		expect(emittedData.json.message).toEqual(jsonData);
		expect(emittedData.json.topic).toBe('test-topic');
		// Should also have binary data attached
		expect(emittedData.binary).toHaveProperty('data');
	});

	it('should decode with schema registry and keep binary data when both are enabled', async () => {
		const messageBuffer = Buffer.from('avro-encoded-data');
		const decodedData = { userId: 123, userName: 'test-user' };
		mockRegistryDecode.mockResolvedValue(decodedData);

		const { emit } = await testTriggerNode(KafkaTrigger, {
			mode: 'trigger',
			node: {
				typeVersion: 1.2,
				parameters: {
					topic: 'test-topic',
					groupId: 'test-group',
					useSchemaRegistry: true,
					schemaRegistryUrl: 'http://localhost:8081',
					options: {
						keepBinaryData: true,
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

		await publishMessage({
			value: messageBuffer,
		});

		// Should call schema registry decode
		expect(mockRegistryDecode).toHaveBeenCalledWith(messageBuffer);

		expect(emit).toHaveBeenCalled();
		const emittedData = emit.mock.calls[0][0][0][0];

		// Should have decoded data in the message field
		expect(emittedData.json.message).toEqual(decodedData);
		expect(emittedData.json.topic).toBe('test-topic');
		// Should also have binary data attached
		expect(emittedData.binary).toHaveProperty('data');
	});

	it('should work with keepBinaryData and onlyMessage together', async () => {
		const jsonData = { result: 'success', data: [1, 2, 3] };
		const messageBuffer = Buffer.from(JSON.stringify(jsonData));

		const { emit } = await testTriggerNode(KafkaTrigger, {
			mode: 'trigger',
			node: {
				typeVersion: 1.2,
				parameters: {
					topic: 'test-topic',
					groupId: 'test-group',
					useSchemaRegistry: false,
					options: {
						keepBinaryData: true,
						jsonParseMessage: true,
						onlyMessage: true,
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

		await publishMessage({
			value: messageBuffer,
		});

		expect(emit).toHaveBeenCalled();
		const emittedData = emit.mock.calls[0][0][0][0];

		// onlyMessage should return just the parsed JSON (not wrapped in message/topic)
		expect(emittedData.json).toEqual(jsonData);
		// Should still have binary data attached
		expect(emittedData.binary).toHaveProperty('data');
	});

	it('should keep binary data with returnHeaders enabled', async () => {
		const messageBuffer = Buffer.from('test-data');

		const { emit } = await testTriggerNode(KafkaTrigger, {
			mode: 'trigger',
			node: {
				typeVersion: 1.2,
				parameters: {
					topic: 'test-topic',
					groupId: 'test-group',
					useSchemaRegistry: false,
					options: {
						keepBinaryData: true,
						returnHeaders: true,
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

		await publishMessage({
			value: messageBuffer,
			headers: {
				'content-type': Buffer.from('application/octet-stream'),
				'message-id': Buffer.from('msg-123'),
			},
		});

		expect(emit).toHaveBeenCalled();
		const emittedData = emit.mock.calls[0][0][0][0];

		// Should have message and headers (message converted to string)
		expect(emittedData.json.message).toBe('test-data');
		expect(emittedData.json.topic).toBe('test-topic');
		expect(emittedData.json.headers).toEqual({
			'content-type': 'application/octet-stream',
			'message-id': 'msg-123',
		});
		// Raw buffer is preserved in binary data for downstream processing
		expect(emittedData.binary).toHaveProperty('data');
	});

	it('should use custom rebalanceTimeout when provided', async () => {
		await testTriggerNode(KafkaTrigger, {
			mode: 'trigger',
			node: {
				typeVersion: 1,
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
				typeVersion: 1,
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

	it('should handle batch processing when batchSize > 1', async () => {
		const { emit } = await testTriggerNode(KafkaTrigger, {
			mode: 'trigger',
			node: {
				parameters: {
					topic: 'test-topic',
					groupId: 'test-group',
					useSchemaRegistry: false,
					options: {
						batchSize: 3,
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

		const publishBatch = (global as any).publishBatch;
		await publishBatch([
			{ value: Buffer.from('message1') },
			{ value: Buffer.from('message2') },
			{ value: Buffer.from('message3') },
		]);

		expect(emit).toHaveBeenCalledWith([
			[
				{ json: { message: 'message1', topic: 'test-topic' } },
				{ json: { message: 'message2', topic: 'test-topic' } },
				{ json: { message: 'message3', topic: 'test-topic' } },
			],
		]);
	});

	it('should process messages in chunks when batch has more messages than batchSize', async () => {
		const { emit } = await testTriggerNode(KafkaTrigger, {
			mode: 'trigger',
			node: {
				parameters: {
					topic: 'test-topic',
					groupId: 'test-group',
					useSchemaRegistry: false,
					options: {
						batchSize: 2,
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

		const publishBatch = (global as any).publishBatch;
		await publishBatch([
			{ value: Buffer.from('message1') },
			{ value: Buffer.from('message2') },
			{ value: Buffer.from('message3') },
			{ value: Buffer.from('message4') },
			{ value: Buffer.from('message5') },
		]);

		// Should be called 3 times: [msg1, msg2], [msg3, msg4], [msg5]
		expect(emit).toHaveBeenCalledTimes(3);
		expect(emit).toHaveBeenNthCalledWith(1, [
			[
				{ json: { message: 'message1', topic: 'test-topic' } },
				{ json: { message: 'message2', topic: 'test-topic' } },
			],
		]);
		expect(emit).toHaveBeenNthCalledWith(2, [
			[
				{ json: { message: 'message3', topic: 'test-topic' } },
				{ json: { message: 'message4', topic: 'test-topic' } },
			],
		]);
		expect(emit).toHaveBeenNthCalledWith(3, [
			[{ json: { message: 'message5', topic: 'test-topic' } }],
		]);
	});

	it('should use fetchMaxBytes and fetchMinBytes when provided', async () => {
		await testTriggerNode(KafkaTrigger, {
			mode: 'trigger',
			node: {
				typeVersion: 1,
				parameters: {
					topic: 'test-topic',
					groupId: 'test-group',
					useSchemaRegistry: false,
					options: {
						fetchMaxBytes: 2097152,
						fetchMinBytes: 1024,
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
			sessionTimeout: 30000,
			heartbeatInterval: 3000,
			rebalanceTimeout: 600000,
			maxBytesPerPartition: 2097152,
			minBytes: 1024,
		});
	});

	it('should use partitionsConsumedConcurrently when provided', async () => {
		await testTriggerNode(KafkaTrigger, {
			mode: 'trigger',
			node: {
				parameters: {
					topic: 'test-topic',
					groupId: 'test-group',
					useSchemaRegistry: false,
					options: {
						partitionsConsumedConcurrently: 5,
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

		expect(mockConsumerRun).toHaveBeenCalledWith(
			expect.objectContaining({
				partitionsConsumedConcurrently: 5,
			}),
		);
	});

	it('should handle batch processing with sequential processing', async () => {
		const { emit } = await testTriggerNode(KafkaTrigger, {
			mode: 'trigger',
			node: {
				typeVersion: 1.1,
				parameters: {
					topic: 'test-topic',
					groupId: 'test-group',
					useSchemaRegistry: false,
					options: {
						batchSize: 2,
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

		const publishBatch = (global as any).publishBatch;
		const publishPromise = publishBatch([
			{ value: Buffer.from('message1') },
			{ value: Buffer.from('message2') },
		]);

		// Wait for the async batch handler to execute
		await new Promise((resolve) => setImmediate(resolve));

		expect(emit).toHaveBeenCalled();

		const deferredPromise = emit.mock.calls[0][2];
		expect(deferredPromise).toBeDefined();

		deferredPromise?.resolve(mock());
		await publishPromise;
	});

	it('should handle batch processing with JSON parsing', async () => {
		const { emit } = await testTriggerNode(KafkaTrigger, {
			mode: 'trigger',
			node: {
				parameters: {
					topic: 'test-topic',
					groupId: 'test-group',
					useSchemaRegistry: false,
					options: {
						batchSize: 2,
						jsonParseMessage: true,
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

		const publishBatch = (global as any).publishBatch;
		await publishBatch([
			{ value: Buffer.from(JSON.stringify({ id: 1, name: 'test1' })) },
			{ value: Buffer.from(JSON.stringify({ id: 2, name: 'test2' })) },
		]);

		expect(emit).toHaveBeenCalledWith([
			[
				{ json: { message: { id: 1, name: 'test1' }, topic: 'test-topic' } },
				{ json: { message: { id: 2, name: 'test2' }, topic: 'test-topic' } },
			],
		]);
	});

	it('should handle batch processing with headers', async () => {
		const { emit } = await testTriggerNode(KafkaTrigger, {
			mode: 'trigger',
			node: {
				typeVersion: 1,
				parameters: {
					topic: 'test-topic',
					groupId: 'test-group',
					useSchemaRegistry: false,
					options: {
						batchSize: 2,
						returnHeaders: true,
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

		const publishBatch = (global as any).publishBatch;
		await publishBatch([
			{
				value: Buffer.from('message1'),
				headers: { 'content-type': Buffer.from('application/json') },
			},
			{
				value: Buffer.from('message2'),
				headers: { 'content-type': Buffer.from('text/plain') },
			},
		]);

		expect(emit).toHaveBeenCalledWith([
			[
				{
					json: {
						message: 'message1',
						topic: 'test-topic',
						headers: { 'content-type': 'application/json' },
					},
				},
				{
					json: {
						message: 'message2',
						topic: 'test-topic',
						headers: { 'content-type': 'text/plain' },
					},
				},
			],
		]);
	});

	it('should keep binary data in batch processing when keepBinaryData is enabled in v1.2', async () => {
		const { emit } = await testTriggerNode(KafkaTrigger, {
			mode: 'trigger',
			node: {
				typeVersion: 1.2,
				parameters: {
					topic: 'test-topic',
					groupId: 'test-group',
					useSchemaRegistry: false,
					options: {
						batchSize: 2,
						keepBinaryData: true,
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

		const publishBatch = (global as any).publishBatch;
		await publishBatch([
			{ value: Buffer.from('binary-data-1') },
			{ value: Buffer.from('binary-data-2') },
		]);

		expect(emit).toHaveBeenCalled();
		const emittedData = emit.mock.calls[0][0][0];

		// Both messages should have binary data
		expect(emittedData[0]).toHaveProperty('json');
		expect(emittedData[0]).toHaveProperty('binary');
		expect(emittedData[0].json.message).toBe('binary-data-1');
		expect(emittedData[0].binary).toHaveProperty('data');

		expect(emittedData[1]).toHaveProperty('json');
		expect(emittedData[1]).toHaveProperty('binary');
		expect(emittedData[1].json.message).toBe('binary-data-2');
		expect(emittedData[1].binary).toHaveProperty('data');
	});

	describe('version 1.3', () => {
		it('should use default sessionTimeout and heartbeatInterval', async () => {
			await testTriggerNode(KafkaTrigger, {
				mode: 'trigger',
				node: {
					typeVersion: 1.3,
					parameters: {
						topic: 'test-topic',
						groupId: 'test-group',
						useSchemaRegistry: false,
						resolveOffset: 'immediately',
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
				heartbeatInterval: 10000,
				rebalanceTimeout: 600000,
			});
		});

		it('should use resolveOffset "immediately" and emit without waiting', async () => {
			const { emit } = await testTriggerNode(KafkaTrigger, {
				mode: 'trigger',
				node: {
					typeVersion: 1.3,
					parameters: {
						topic: 'test-topic',
						groupId: 'test-group',
						useSchemaRegistry: false,
						resolveOffset: 'immediately',
					},
				},
				credential: {
					brokers: 'localhost:9092',
					clientId: 'n8n-kafka',
					ssl: false,
					authentication: false,
				},
			});

			await publishMessage({ value: Buffer.from('test-message') });

			expect(emit).toHaveBeenCalledWith([
				[{ json: { message: 'test-message', topic: 'test-topic' } }],
			]);
			expect(emit.mock.calls[0][2]).toBeUndefined();
		});

		it('should use resolveOffset "onCompletion" and wait for execution', async () => {
			const { emit } = await testTriggerNode(KafkaTrigger, {
				mode: 'trigger',
				node: {
					typeVersion: 1.3,
					parameters: {
						topic: 'test-topic',
						groupId: 'test-group',
						useSchemaRegistry: false,
						resolveOffset: 'onCompletion',
					},
				},
				credential: {
					brokers: 'localhost:9092',
					clientId: 'n8n-kafka',
					ssl: false,
					authentication: false,
				},
			});

			const publishPromise = publishMessage({ value: Buffer.from('test-message') });
			await new Promise((resolve) => setImmediate(resolve));

			expect(emit).toHaveBeenCalled();
			const deferredPromise = emit.mock.calls[0][2];
			expect(deferredPromise).toBeDefined();

			deferredPromise?.resolve(mock());
			await publishPromise;
		});

		it('should use resolveOffset "onSuccess" and wait for successful execution', async () => {
			const { emit } = await testTriggerNode(KafkaTrigger, {
				mode: 'trigger',
				node: {
					typeVersion: 1.3,
					parameters: {
						topic: 'test-topic',
						groupId: 'test-group',
						useSchemaRegistry: false,
						resolveOffset: 'onSuccess',
					},
				},
				credential: {
					brokers: 'localhost:9092',
					clientId: 'n8n-kafka',
					ssl: false,
					authentication: false,
				},
			});

			const publishPromise = publishMessage({ value: Buffer.from('test-message') });
			await new Promise((resolve) => setImmediate(resolve));

			expect(emit).toHaveBeenCalled();
			const deferredPromise = emit.mock.calls[0][2];
			expect(deferredPromise).toBeDefined();

			deferredPromise?.resolve(mock<IRun>({ status: 'success' }));
			await publishPromise;
		});

		it('should return success false when resolveOffset is "onSuccess" and execution fails', async () => {
			const { emit } = await testTriggerNode(KafkaTrigger, {
				mode: 'trigger',
				node: {
					typeVersion: 1.3,
					parameters: {
						topic: 'test-topic',
						groupId: 'test-group',
						useSchemaRegistry: false,
						resolveOffset: 'onSuccess',
					},
				},
				credential: {
					brokers: 'localhost:9092',
					clientId: 'n8n-kafka',
					ssl: false,
					authentication: false,
				},
			});

			const publishPromise = publishMessage({ value: Buffer.from('test-message') });
			await new Promise((resolve) => setImmediate(resolve));

			expect(emit).toHaveBeenCalled();
			const deferredPromise = emit.mock.calls[0][2];
			expect(deferredPromise).toBeDefined();

			deferredPromise?.resolve(mock<IRun>({ status: 'error' }));
			// The emitter catches the error, logs it, and returns { success: false }
			// instead of throwing, so the promise resolves (not rejects)
			await publishPromise;
		});

		it('should use sessionTimeout and heartbeatInterval options when provided', async () => {
			await testTriggerNode(KafkaTrigger, {
				mode: 'trigger',
				node: {
					typeVersion: 1.3,
					parameters: {
						topic: 'test-topic',
						groupId: 'test-group',
						useSchemaRegistry: false,
						resolveOffset: 'immediately',
						options: {
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
				rebalanceTimeout: 600000,
			});
		});

		it('should use resolveOffset "onStatus" and resolve when status matches allowed statuses', async () => {
			const { emit } = await testTriggerNode(KafkaTrigger, {
				mode: 'trigger',
				node: {
					typeVersion: 1.3,
					parameters: {
						topic: 'test-topic',
						groupId: 'test-group',
						useSchemaRegistry: false,
						resolveOffset: 'onStatus',
						allowedStatuses: ['success', 'error'],
					},
				},
				credential: {
					brokers: 'localhost:9092',
					clientId: 'n8n-kafka',
					ssl: false,
					authentication: false,
				},
			});

			const publishPromise = publishMessage({ value: Buffer.from('test-message') });
			await new Promise((resolve) => setImmediate(resolve));

			expect(emit).toHaveBeenCalled();
			const deferredPromise = emit.mock.calls[0][2];
			expect(deferredPromise).toBeDefined();

			// Should resolve successfully when status is in allowedStatuses
			deferredPromise?.resolve(mock<IRun>({ status: 'error' }));
			await publishPromise;
		});

		it('should use resolveOffset "onStatus" and fail when status does not match allowed statuses', async () => {
			const { emit } = await testTriggerNode(KafkaTrigger, {
				mode: 'trigger',
				node: {
					typeVersion: 1.3,
					parameters: {
						topic: 'test-topic',
						groupId: 'test-group',
						useSchemaRegistry: false,
						resolveOffset: 'onStatus',
						allowedStatuses: ['success'],
					},
				},
				credential: {
					brokers: 'localhost:9092',
					clientId: 'n8n-kafka',
					ssl: false,
					authentication: false,
				},
			});

			const publishPromise = publishMessage({ value: Buffer.from('test-message') });
			await new Promise((resolve) => setImmediate(resolve));

			expect(emit).toHaveBeenCalled();
			const deferredPromise = emit.mock.calls[0][2];
			expect(deferredPromise).toBeDefined();

			// Should fail when status is not in allowedStatuses
			deferredPromise?.resolve(mock<IRun>({ status: 'error' }));
			// The emitter catches the error, logs it, and returns { success: false }
			await publishPromise;
		});

		it('should throw error when resolveOffset is "onStatus" but no statuses are selected', async () => {
			await expect(
				testTriggerNode(KafkaTrigger, {
					mode: 'trigger',
					node: {
						typeVersion: 1.3,
						parameters: {
							topic: 'test-topic',
							groupId: 'test-group',
							useSchemaRegistry: false,
							resolveOffset: 'onStatus',
							allowedStatuses: [],
						},
					},
					credential: {
						brokers: 'localhost:9092',
						clientId: 'n8n-kafka',
						ssl: false,
						authentication: false,
					},
				}),
			).rejects.toThrow(NodeOperationError);
		});

		it('should stop processing batch when isRunning returns false (consumer stopping)', async () => {
			let eachBatchHandler: EachBatchHandler | undefined;
			mockConsumerRun.mockImplementation(({ eachBatch }: ConsumerRunConfig) => {
				if (eachBatch) {
					eachBatchHandler = eachBatch;
				}
			});

			const { emit } = await testTriggerNode(KafkaTrigger, {
				mode: 'trigger',
				node: {
					typeVersion: 1.3,
					parameters: {
						topic: 'test-topic',
						groupId: 'test-group',
						useSchemaRegistry: false,
						resolveOffset: 'immediately',
						options: {
							batchSize: 1,
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

			const mockResolveOffset = jest.fn();
			const mockHeartbeat = jest.fn();

			// Simulate consumer stopping after first message
			let messageCount = 0;
			const mockIsRunning = jest.fn(() => {
				messageCount++;
				return messageCount <= 1; // Returns true for first message, false after
			});

			await eachBatchHandler!({
				batch: {
					topic: 'test-topic',
					partition: 0,
					highWatermark: '100',
					messages: [
						{
							attributes: 1,
							key: Buffer.from('key1'),
							offset: '0',
							timestamp: new Date().toISOString(),
							value: Buffer.from('message1'),
							headers: {},
						},
						{
							attributes: 1,
							key: Buffer.from('key2'),
							offset: '1',
							timestamp: new Date().toISOString(),
							value: Buffer.from('message2'),
							headers: {},
						},
						{
							attributes: 1,
							key: Buffer.from('key3'),
							offset: '2',
							timestamp: new Date().toISOString(),
							value: Buffer.from('message3'),
							headers: {},
						},
					] as RecordBatchEntry[],
					isEmpty: () => false,
					firstOffset: () => '0',
					lastOffset: () => '2',
					offsetLag: () => '0',
					offsetLagLow: () => '0',
				},
				resolveOffset: mockResolveOffset,
				heartbeat: mockHeartbeat,
				commitOffsetsIfNecessary: jest.fn(),
				uncommittedOffsets: jest.fn(),
				isRunning: mockIsRunning,
				isStale: jest.fn(() => false),
				pause: jest.fn(),
			});

			// Should only process first message before isRunning returns false
			expect(emit).toHaveBeenCalledTimes(1);
			expect(mockResolveOffset).toHaveBeenCalledTimes(1);
			expect(mockResolveOffset).toHaveBeenCalledWith('0');
		});

		it('should stop processing batch when isStale returns true (partition revoked)', async () => {
			let eachBatchHandler: EachBatchHandler | undefined;
			mockConsumerRun.mockImplementation(({ eachBatch }: ConsumerRunConfig) => {
				if (eachBatch) {
					eachBatchHandler = eachBatch;
				}
			});

			const { emit } = await testTriggerNode(KafkaTrigger, {
				mode: 'trigger',
				node: {
					typeVersion: 1.3,
					parameters: {
						topic: 'test-topic',
						groupId: 'test-group',
						useSchemaRegistry: false,
						resolveOffset: 'immediately',
						options: {
							batchSize: 1,
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

			const mockResolveOffset = jest.fn();
			const mockHeartbeat = jest.fn();

			// Simulate partition becoming stale after first message (rebalance occurred)
			let messageCount = 0;
			const mockIsStale = jest.fn(() => {
				messageCount++;
				return messageCount > 1; // Returns false for first message, true after
			});

			await eachBatchHandler!({
				batch: {
					topic: 'test-topic',
					partition: 0,
					highWatermark: '100',
					messages: [
						{
							attributes: 1,
							key: Buffer.from('key1'),
							offset: '0',
							timestamp: new Date().toISOString(),
							value: Buffer.from('message1'),
							headers: {},
						},
						{
							attributes: 1,
							key: Buffer.from('key2'),
							offset: '1',
							timestamp: new Date().toISOString(),
							value: Buffer.from('message2'),
							headers: {},
						},
						{
							attributes: 1,
							key: Buffer.from('key3'),
							offset: '2',
							timestamp: new Date().toISOString(),
							value: Buffer.from('message3'),
							headers: {},
						},
					] as RecordBatchEntry[],
					isEmpty: () => false,
					firstOffset: () => '0',
					lastOffset: () => '2',
					offsetLag: () => '0',
					offsetLagLow: () => '0',
				},
				resolveOffset: mockResolveOffset,
				heartbeat: mockHeartbeat,
				commitOffsetsIfNecessary: jest.fn(),
				uncommittedOffsets: jest.fn(),
				isRunning: jest.fn(() => true),
				isStale: mockIsStale,
				pause: jest.fn(),
			});

			// Should only process first message before isStale returns true
			expect(emit).toHaveBeenCalledTimes(1);
			expect(mockResolveOffset).toHaveBeenCalledTimes(1);
			expect(mockResolveOffset).toHaveBeenCalledWith('0');
		});

		it('should use default auto commit settings (autoCommit true, eachBatchAutoResolve false)', async () => {
			await testTriggerNode(KafkaTrigger, {
				mode: 'trigger',
				node: {
					typeVersion: 1.3,
					parameters: {
						topic: 'test-topic',
						groupId: 'test-group',
						useSchemaRegistry: false,
						resolveOffset: 'onSuccess',
					},
				},
				credential: {
					brokers: 'localhost:9092',
					clientId: 'n8n-kafka',
					ssl: false,
					authentication: false,
				},
			});

			expect(mockConsumerRun).toHaveBeenCalledWith(
				expect.objectContaining({
					autoCommit: true,
					eachBatchAutoResolve: false,
				}),
			);
		});

		it('should enable eachBatchAutoResolve when option is set', async () => {
			await testTriggerNode(KafkaTrigger, {
				mode: 'trigger',
				node: {
					typeVersion: 1.3,
					parameters: {
						topic: 'test-topic',
						groupId: 'test-group',
						useSchemaRegistry: false,
						resolveOffset: 'onCompletion',
						options: {
							eachBatchAutoResolve: true,
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

			expect(mockConsumerRun).toHaveBeenCalledWith(
				expect.objectContaining({
					autoCommit: true,
					eachBatchAutoResolve: true,
				}),
			);
		});

		it('should use default auto commit settings with onStatus resolveOffset', async () => {
			await testTriggerNode(KafkaTrigger, {
				mode: 'trigger',
				node: {
					typeVersion: 1.3,
					parameters: {
						topic: 'test-topic',
						groupId: 'test-group',
						useSchemaRegistry: false,
						resolveOffset: 'onStatus',
						allowedStatuses: ['success'],
					},
				},
				credential: {
					brokers: 'localhost:9092',
					clientId: 'n8n-kafka',
					ssl: false,
					authentication: false,
				},
			});

			expect(mockConsumerRun).toHaveBeenCalledWith(
				expect.objectContaining({
					autoCommit: true,
					eachBatchAutoResolve: false,
				}),
			);
		});

		it('should use default auto commit settings with immediately resolveOffset', async () => {
			await testTriggerNode(KafkaTrigger, {
				mode: 'trigger',
				node: {
					typeVersion: 1.3,
					parameters: {
						topic: 'test-topic',
						groupId: 'test-group',
						useSchemaRegistry: false,
						resolveOffset: 'immediately',
					},
				},
				credential: {
					brokers: 'localhost:9092',
					clientId: 'n8n-kafka',
					ssl: false,
					authentication: false,
				},
			});

			expect(mockConsumerRun).toHaveBeenCalledWith(
				expect.objectContaining({
					autoCommit: true,
					eachBatchAutoResolve: false,
				}),
			);
		});

		it('should process all messages when isRunning and isStale return normal values', async () => {
			let eachBatchHandler: EachBatchHandler | undefined;
			mockConsumerRun.mockImplementation(({ eachBatch }: ConsumerRunConfig) => {
				if (eachBatch) {
					eachBatchHandler = eachBatch;
				}
			});

			const { emit } = await testTriggerNode(KafkaTrigger, {
				mode: 'trigger',
				node: {
					typeVersion: 1.3,
					parameters: {
						topic: 'test-topic',
						groupId: 'test-group',
						useSchemaRegistry: false,
						resolveOffset: 'immediately',
						options: {
							batchSize: 1,
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

			const mockResolveOffset = jest.fn();
			const mockHeartbeat = jest.fn();

			await eachBatchHandler!({
				batch: {
					topic: 'test-topic',
					partition: 0,
					highWatermark: '100',
					messages: [
						{
							attributes: 1,
							key: Buffer.from('key1'),
							offset: '0',
							timestamp: new Date().toISOString(),
							value: Buffer.from('message1'),
							headers: {},
						},
						{
							attributes: 1,
							key: Buffer.from('key2'),
							offset: '1',
							timestamp: new Date().toISOString(),
							value: Buffer.from('message2'),
							headers: {},
						},
						{
							attributes: 1,
							key: Buffer.from('key3'),
							offset: '2',
							timestamp: new Date().toISOString(),
							value: Buffer.from('message3'),
							headers: {},
						},
					] as RecordBatchEntry[],
					isEmpty: () => false,
					firstOffset: () => '0',
					lastOffset: () => '2',
					offsetLag: () => '0',
					offsetLagLow: () => '0',
				},
				resolveOffset: mockResolveOffset,
				heartbeat: mockHeartbeat,
				commitOffsetsIfNecessary: jest.fn(),
				uncommittedOffsets: jest.fn(),
				isRunning: jest.fn(() => true),
				isStale: jest.fn(() => false),
				pause: jest.fn(),
			});

			// Should process all 3 messages
			expect(emit).toHaveBeenCalledTimes(3);
			expect(mockResolveOffset).toHaveBeenCalledTimes(3);
			expect(mockResolveOffset).toHaveBeenNthCalledWith(1, '0');
			expect(mockResolveOffset).toHaveBeenNthCalledWith(2, '1');
			expect(mockResolveOffset).toHaveBeenNthCalledWith(3, '2');
		});
	});
});
