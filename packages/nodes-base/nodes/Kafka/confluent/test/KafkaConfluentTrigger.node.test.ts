import { KafkaJS } from '@confluentinc/kafka-javascript';
import type { Mock } from 'vitest';
import type * as _importType0 from 'n8n-workflow';

import { testTriggerNode } from '@test/nodes/TriggerHelpers';

import { KafkaConfluentTrigger } from '../KafkaConfluentTrigger.node';

vi.mock('@confluentinc/kafka-javascript', () => ({
	KafkaJS: {
		Kafka: vi.fn(),
		logLevel: { ERROR: 1 },
	},
}));

vi.mock('@kafkajs/confluent-schema-registry');
vi.mock('n8n-workflow', async () => {
	const actual = await vi.importActual<typeof _importType0>('n8n-workflow');
	return { ...actual, sleep: vi.fn().mockResolvedValue(undefined) };
});

// KafkaJS.Kafka is vi.fn() (set up by the factory above).
// Each test group calls makeConsumerMocks() which re-wires mockImplementation
// so `new KafkaJS.Kafka(...)` returns a fresh kafka stub.

type EachBatchHandler = (payload: {
	batch: {
		topic: string;
		messages: Array<{
			value: Buffer | null;
			key: Buffer | null;
			headers: Record<string, Buffer | string>;
			timestamp: string;
			offset: string;
			attributes: number;
			size: number;
		}>;
	};
	resolveOffset: ReturnType<typeof vi.fn>;
	heartbeat: ReturnType<typeof vi.fn>;
	commitOffsetsIfNecessary: ReturnType<typeof vi.fn>;
	isRunning: ReturnType<typeof vi.fn>;
	isStale: ReturnType<typeof vi.fn>;
}) => Promise<void>;

function makeConsumerMocks() {
	let capturedEachBatch: EachBatchHandler | undefined;

	const mockConsumerConnect = vi.fn().mockResolvedValue(undefined);
	const mockConsumerSubscribe = vi.fn().mockResolvedValue(undefined);
	const mockConsumerRun = vi.fn(({ eachBatch }: { eachBatch?: EachBatchHandler }) => {
		if (eachBatch) capturedEachBatch = eachBatch;
	});
	const mockConsumerDisconnect = vi.fn().mockResolvedValue(undefined);
	const mockConsumerCreate = vi.fn(() => ({
		connect: mockConsumerConnect,
		subscribe: mockConsumerSubscribe,
		run: mockConsumerRun,
		disconnect: mockConsumerDisconnect,
	}));

	(KafkaJS.Kafka as unknown as Mock).mockImplementation(function () {
		return { consumer: mockConsumerCreate };
	});

	const publishBatch = async (
		messages: Array<{
			value: Buffer;
			key?: Buffer | null;
			headers?: Record<string, Buffer | string>;
			offset?: string;
		}>,
		topic = 'test-topic',
	) => {
		if (!capturedEachBatch)
			throw new Error(
				'eachBatch handler not registered — ensure testTriggerNode resolved before calling publishBatch',
			);
		await capturedEachBatch({
			batch: {
				topic,
				messages: messages.map((m, i) => ({
					value: m.value,
					key: m.key ?? Buffer.from('key'),
					headers: m.headers ?? {},
					timestamp: '0',
					offset: m.offset ?? String(i),
					attributes: 0,
					size: 0,
				})),
			},
			resolveOffset: vi.fn(),
			heartbeat: vi.fn().mockResolvedValue(undefined),
			commitOffsetsIfNecessary: vi.fn().mockResolvedValue(undefined),
			isRunning: vi.fn().mockReturnValue(true),
			isStale: vi.fn().mockReturnValue(false),
		});
	};

	const publishMessage = (
		message: {
			value: Buffer;
			key?: Buffer | null;
			headers?: Record<string, Buffer | string>;
			offset?: string;
		},
		topic?: string,
	) => publishBatch([message], topic);

	return {
		mockConsumerConnect,
		mockConsumerSubscribe,
		mockConsumerRun,
		mockConsumerDisconnect,
		mockConsumerCreate,
		publishBatch,
		publishMessage,
		getCapturedEachBatch: () => capturedEachBatch,
	};
}

const CREDENTIAL = {
	brokers: 'localhost:9092',
	clientId: 'n8n-kafka',
	ssl: false,
	authentication: false,
};

describe('KafkaConfluentTrigger Node', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('connects to Kafka and subscribes to topic', async () => {
		const { mockConsumerConnect, mockConsumerSubscribe, mockConsumerRun } = makeConsumerMocks();

		await testTriggerNode(KafkaConfluentTrigger, {
			mode: 'trigger',
			node: {
				typeVersion: 1,
				parameters: {
					topic: 'test-topic',
					groupId: 'test-group',
					resolveOffset: 'immediately',
					useSchemaRegistry: false,
					options: {},
				},
			},
			credential: CREDENTIAL,
		});

		expect(mockConsumerConnect).toHaveBeenCalled();
		expect(mockConsumerSubscribe).toHaveBeenCalledWith({ topic: 'test-topic' });
		expect(mockConsumerRun).toHaveBeenCalled();
	});

	describe('message fidelity (C5)', () => {
		it('emits message value as string with topic', async () => {
			const { publishMessage } = makeConsumerMocks();

			const { emit } = await testTriggerNode(KafkaConfluentTrigger, {
				mode: 'trigger',
				node: {
					typeVersion: 1,
					parameters: {
						topic: 'test-topic',
						groupId: 'g',
						resolveOffset: 'immediately',
						useSchemaRegistry: false,
						options: {},
					},
				},
				credential: CREDENTIAL,
			});

			await publishMessage({ value: Buffer.from('hello world') });

			expect(emit).toHaveBeenCalledOnce();
			const emittedItem = emit.mock.calls[0][0][0][0];
			expect(emittedItem.json.message).toBe('hello world');
			expect(emittedItem.json.topic).toBe('test-topic');
		});

		it('does not crash on null key (C5 — null key fidelity)', async () => {
			const { publishMessage } = makeConsumerMocks();

			const { emit } = await testTriggerNode(KafkaConfluentTrigger, {
				mode: 'trigger',
				node: {
					typeVersion: 1,
					parameters: {
						topic: 'test-topic',
						groupId: 'g',
						resolveOffset: 'immediately',
						useSchemaRegistry: false,
						options: {},
					},
				},
				credential: CREDENTIAL,
			});

			await publishMessage({ value: Buffer.from('msg'), key: null });

			expect(emit).toHaveBeenCalledOnce();
		});

		it('includes headers when returnHeaders is true (C5 — header fidelity)', async () => {
			const { publishMessage } = makeConsumerMocks();

			const { emit } = await testTriggerNode(KafkaConfluentTrigger, {
				mode: 'trigger',
				node: {
					typeVersion: 1,
					parameters: {
						topic: 'test-topic',
						groupId: 'g',
						resolveOffset: 'immediately',
						useSchemaRegistry: false,
						options: { returnHeaders: true },
					},
				},
				credential: CREDENTIAL,
			});

			await publishMessage({
				value: Buffer.from('msg'),
				headers: { 'x-trace-id': Buffer.from('abc123') },
			});

			const emittedItem = emit.mock.calls[0][0][0][0];
			expect(emittedItem.json.headers).toEqual({ 'x-trace-id': 'abc123' });
		});

		it('parses JSON when jsonParseMessage is true (C5 — value fidelity)', async () => {
			const { publishMessage } = makeConsumerMocks();

			const { emit } = await testTriggerNode(KafkaConfluentTrigger, {
				mode: 'trigger',
				node: {
					typeVersion: 1,
					parameters: {
						topic: 'test-topic',
						groupId: 'g',
						resolveOffset: 'immediately',
						useSchemaRegistry: false,
						options: { jsonParseMessage: true },
					},
				},
				credential: CREDENTIAL,
			});

			await publishMessage({ value: Buffer.from('{"foo":"bar"}') });

			const emittedItem = emit.mock.calls[0][0][0][0];
			expect(emittedItem.json.message).toEqual({ foo: 'bar' });
		});

		it('keeps message as binary when keepBinaryData is true (C5 — binary fidelity)', async () => {
			const prepareBinaryData = vi.fn().mockResolvedValue({
				data: 'base64-encoded',
				mimeType: 'application/octet-stream',
			});
			const { publishMessage } = makeConsumerMocks();

			const { emit } = await testTriggerNode(KafkaConfluentTrigger, {
				mode: 'trigger',
				node: {
					typeVersion: 1,
					parameters: {
						topic: 'test-topic',
						groupId: 'g',
						resolveOffset: 'immediately',
						useSchemaRegistry: false,
						options: { keepBinaryData: true },
					},
				},
				credential: CREDENTIAL,
				helpers: { prepareBinaryData },
			});

			await publishMessage({ value: Buffer.from('\x00\x01\x02') });

			const emittedItem = emit.mock.calls[0][0][0][0];
			expect(emittedItem.binary).toHaveProperty('data');
		});
	});

	describe('resolve offset (C3)', () => {
		it('resolves offset immediately in "immediately" mode', async () => {
			const { getCapturedEachBatch } = makeConsumerMocks();

			await testTriggerNode(KafkaConfluentTrigger, {
				mode: 'trigger',
				node: {
					typeVersion: 1,
					parameters: {
						topic: 'test-topic',
						groupId: 'g',
						resolveOffset: 'immediately',
						useSchemaRegistry: false,
						options: {},
					},
				},
				credential: CREDENTIAL,
			});

			const mockResolveOffset = vi.fn();
			const eachBatch = getCapturedEachBatch()!;

			await eachBatch({
				batch: {
					topic: 'test-topic',
					messages: [
						{
							value: Buffer.from('x'),
							key: null,
							headers: {},
							timestamp: '0',
							offset: '42',
							attributes: 0,
							size: 0,
						},
					],
				},
				resolveOffset: mockResolveOffset,
				heartbeat: vi.fn().mockResolvedValue(undefined),
				commitOffsetsIfNecessary: vi.fn().mockResolvedValue(undefined),
				isRunning: vi.fn().mockReturnValue(true),
				isStale: vi.fn().mockReturnValue(false),
			});

			expect(mockResolveOffset).toHaveBeenCalledWith('42');
		});

		it('passes a deferred promise to emit in "onCompletion" mode', async () => {
			const { getCapturedEachBatch } = makeConsumerMocks();

			const { emit } = await testTriggerNode(KafkaConfluentTrigger, {
				mode: 'trigger',
				node: {
					typeVersion: 1,
					parameters: {
						topic: 'test-topic',
						groupId: 'g',
						resolveOffset: 'onCompletion',
						useSchemaRegistry: false,
						options: {},
					},
				},
				credential: CREDENTIAL,
			});

			const eachBatch = getCapturedEachBatch()!;

			// Fire the batch — don't await so we can inspect while it's in-flight.
			eachBatch({
				batch: {
					topic: 'test-topic',
					messages: [
						{
							value: Buffer.from('x'),
							key: null,
							headers: {},
							timestamp: '0',
							offset: '10',
							attributes: 0,
							size: 0,
						},
					],
				},
				resolveOffset: vi.fn(),
				heartbeat: vi.fn().mockResolvedValue(undefined),
				commitOffsetsIfNecessary: vi.fn().mockResolvedValue(undefined),
				isRunning: vi.fn().mockReturnValue(true),
				isStale: vi.fn().mockReturnValue(false),
			}).catch(() => {});

			// Drain microtasks so emit is called.
			await new Promise((resolve) => setImmediate(resolve));

			expect(emit).toHaveBeenCalled();

			// In "onCompletion" mode, emit receives a deferred promise as the 3rd arg.
			// Absence of the arg would indicate "immediately" mode (no waiting).
			const deferredArg = emit.mock.calls[0][2];
			expect(deferredArg).toBeDefined();
			expect(typeof deferredArg?.resolve).toBe('function');
		});
	});

	describe('disconnect (C7)', () => {
		it('calls consumer.disconnect on close', async () => {
			const { mockConsumerDisconnect } = makeConsumerMocks();

			const { close } = await testTriggerNode(KafkaConfluentTrigger, {
				mode: 'trigger',
				node: {
					typeVersion: 1,
					parameters: {
						topic: 'test-topic',
						groupId: 'g',
						resolveOffset: 'immediately',
						useSchemaRegistry: false,
						options: {},
					},
				},
				credential: CREDENTIAL,
			});

			await close();

			expect(mockConsumerDisconnect).toHaveBeenCalledOnce();
		});
	});

	describe('manual trigger mode', () => {
		it('defers connection until manualTriggerFunction is called', async () => {
			const { mockConsumerConnect, publishMessage } = makeConsumerMocks();

			const { emit, manualTriggerFunction } = await testTriggerNode(KafkaConfluentTrigger, {
				mode: 'manual',
				node: {
					typeVersion: 1,
					parameters: {
						topic: 'test-topic',
						groupId: 'g',
						resolveOffset: 'immediately',
						useSchemaRegistry: false,
						options: {},
					},
				},
				credential: CREDENTIAL,
			});

			expect(mockConsumerConnect).not.toHaveBeenCalled();

			await manualTriggerFunction?.();

			expect(mockConsumerConnect).toHaveBeenCalledOnce();

			await publishMessage({ value: Buffer.from('test') });

			expect(emit).toHaveBeenCalledWith([[{ json: { message: 'test', topic: 'test-topic' } }]]);
		});
	});
});
