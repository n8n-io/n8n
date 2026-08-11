/**
 * Exercises the v2 consumer against a real Kafka broker, provisioned by
 * testcontainers, so this needs nothing set up by hand.
 *
 *   pnpm --filter n8n-nodes-base test:integration:skip kafka
 *
 * On "Could not find a working container runtime strategy", point testcontainers
 * at your Docker socket. With Colima:
 *
 *   DOCKER_HOST="unix://$HOME/.colima/default/docker.sock" \
 *   TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock \
 *   pnpm --filter n8n-nodes-base test:integration:skip kafka
 *
 * Schema Registry decoding is not covered: the shared Kafka service has no
 * registry. It is verified by the unit tests with a mocked client, and by the
 * manual evidence on ENT-222.
 */
import { sleep } from '@n8n/utils/sleep';
import { Kafka, type Consumer } from 'kafkajs';
import { createServiceStack, type N8NStack } from 'n8n-containers';
import type {
	IBinaryData,
	INodeExecutionData,
	INodeTypeBaseDescription,
	ITriggerFunctions,
	Logger,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { testTriggerNode } from '@test/nodes/TriggerHelpers';

import type { KafkaCredentials } from '../../utils';
import { KafkaTriggerV1 } from '../../v1/KafkaTriggerV1.node';
import { consumeTopic, type KafkaConsumerHandle } from '../../v2/consumer/ConsumeTopic';
import { createMessageParser } from '../../v2/consumer/MessageParser';
import { createKafkaClient } from '../../v2/transport/client';
import { createKafkaConsumer } from '../../v2/transport/consumer';
import { createLibraryLogger } from '../../v2/transport/LibraryLogger';

const logger = mock<Logger>();
const prepareBinaryData = (async () =>
	mock<IBinaryData>()) as unknown as ITriggerFunctions['helpers']['prepareBinaryData'];
let stack: N8NStack;
let credentials: KafkaCredentials;
/** Runs a command inside the broker container, where the Kafka CLI tools live. */
let inBroker: (command: string) => Promise<string>;

beforeAll(async () => {
	stack = await createServiceStack({ services: ['kafka'] });
	// The stack types services generically, so narrow to the Kafka shape here, as
	// the MySQL integration test does.
	const kafka = stack.serviceResults.kafka as unknown as {
		meta: { externalBroker: string };
		container: { exec: (command: string[]) => Promise<{ output: string; exitCode: number }> };
	};

	credentials = {
		clientId: 'n8n-kafka-integration',
		brokers: kafka.meta.externalBroker,
		ssl: false,
		authentication: false,
	};

	inBroker = async (command) => {
		const { output, exitCode } = await kafka.container.exec(['sh', '-c', command]);
		if (exitCode !== 0) throw new Error(`in-broker command failed (${exitCode}): ${output}`);
		return output;
	};
});

afterAll(async () => {
	await stack?.stop();
});

const uniqueTopic = (prefix: string) => `n8n-v2-${prefix}-${Date.now()}`;

async function createTopic(topic: string) {
	await inBroker(
		'kafka-topics --bootstrap-server localhost:9092 --create --if-not-exists ' +
			`--partitions 1 --replication-factor 1 --topic ${topic}`,
	);
}

/**
 * Produces through the broker's own CLI rather than a client library: it is the
 * only producer that can write all four compression codecs.
 */
async function produce(topic: string, message: string, codec?: string) {
	await inBroker(
		`echo '${message}' | kafka-console-producer --bootstrap-server localhost:9092 ` +
			`--topic ${topic}${codec ? ` --compression-codec ${codec}` : ''}`,
	);
}

/** Writes several messages in one producer run, one per line. */
async function produceMany(topic: string, messages: string[]) {
	await inBroker(
		`printf '${messages.join('\\n')}\\n' | kafka-console-producer ` +
			`--bootstrap-server localhost:9092 --topic ${topic}`,
	);
}

/**
 * Starts a v2 consumer that reads from the beginning, so a message produced
 * before it joined is still delivered.
 */
async function startConsumer(topic: string, groupSuffix = 'group') {
	const consumer = await createKafkaConsumer(credentials, {
		groupId: `${topic}-${groupSuffix}`,
		fromBeginning: true,
	});

	let deliver!: (item: INodeExecutionData) => void;
	const firstItem = new Promise<INodeExecutionData>((resolve) => (deliver = resolve));

	const handle = await consumeTopic(consumer, {
		topic,
		logger,
		parseMessage: createMessageParser({}, logger, undefined, prepareBinaryData),
		emit: async (items) => {
			if (items[0]) deliver(items[0]);
			return { mayAdvance: true };
		},
	});

	return { handle, firstItem };
}

async function withDeadline<T>(promise: Promise<T>, ms: number, what: string): Promise<T> {
	let timer: NodeJS.Timeout | undefined;
	try {
		return await Promise.race([
			promise,
			new Promise<never>((_, reject) => {
				timer = setTimeout(() => reject(new Error(`timed out waiting for ${what}`)), ms);
			}),
		]);
	} finally {
		clearTimeout(timer);
	}
}

describe('v2 consumer against a real broker', () => {
	// librdkafka 2.14.2 reports gzip, snappy, lz4 and zstd in its feature list, so
	// none of these is skipped. Re-check `require('@confluentinc/kafka-javascript').features`
	// if a codec here starts failing after a binary bump.
	it.each(['gzip', 'snappy', 'lz4', 'zstd'])(
		'receives and parses a %s-compressed message with no compression configuration',
		async (codec) => {
			const topic = uniqueTopic(codec);
			await createTopic(topic);
			await produce(topic, `hello ${codec}`, codec);

			const { handle, firstItem } = await startConsumer(topic);
			try {
				await expect(withDeadline(firstItem, 60_000, `${codec} message`)).resolves.toStrictEqual({
					json: { message: `hello ${codec}`, topic },
				});
			} finally {
				await handle.close();
			}
		},
	);

	it('receives an uncompressed message in version 1 item shape', async () => {
		const topic = uniqueTopic('plain');
		await createTopic(topic);
		await produce(topic, 'hello from v2');

		const { handle, firstItem } = await startConsumer(topic);
		try {
			const item = await withDeadline(firstItem, 60_000, 'plain message');

			expect(item).toStrictEqual({ json: { message: 'hello from v2', topic } });
			expect(Object.keys(item.json)).not.toContain('key');
			expect(Object.keys(item.json)).not.toContain('timestamp');
		} finally {
			await handle.close();
		}
	});
});

describe('delivery guarantees against a real broker', () => {
	it('chunks a real batch by batch size, so each chunk is one execution', async () => {
		const topic = uniqueTopic('batching');
		await createTopic(topic);
		await produceMany(topic, ['1', '2', '3', '4', '5', '6', '7']);

		const consumer = await createKafkaConsumer(credentials, {
			groupId: `${topic}-group`,
			fromBeginning: true,
		});

		const chunks: string[][] = [];
		const seen = () => chunks.flat().length;

		const handle = await consumeTopic(consumer, {
			topic,
			logger,
			batchSize: 3,
			parseMessage: createMessageParser({}, logger, undefined, prepareBinaryData),
			emit: async (items) => {
				chunks.push(items.map((item) => String(item.json.message)));
				return { mayAdvance: true };
			},
		});

		try {
			const deadline = Date.now() + 60_000;
			while (seen() < 7 && Date.now() < deadline) await sleep(250);

			// Every message reaches a workflow exactly once, in order.
			expect(chunks.flat()).toEqual(['1', '2', '3', '4', '5', '6', '7']);

			// Batch Size is an upper bound, not a target. Even with all seven already
			// on the topic before the consumer joins, the broker answers the first
			// fetches with less than a full batch: this run produced chunks of
			// [1, 1, 3, 2]. So the only guarantee worth asserting is the ceiling.
			// Exact chunking is covered deterministically by the unit tests.
			expect(Math.max(...chunks.map((chunk) => chunk.length))).toBeLessThanOrEqual(3);
		} finally {
			await handle.close();
		}
	});

	it('re-delivers a message the workflow refused, rather than committing it', async () => {
		const topic = uniqueTopic('atleastonce');
		const groupId = `${topic}-group`;
		await createTopic(topic);
		await produce(topic, 'must not be lost');

		/** Runs one consumer in the same group until it has seen a message. */
		const consumeOnce = async (mayAdvance: boolean) => {
			const consumer = await createKafkaConsumer(credentials, { groupId, fromBeginning: true });
			const received: string[] = [];
			const handle = await consumeTopic(consumer, {
				topic,
				logger,
				parseMessage: createMessageParser({}, logger, undefined, prepareBinaryData),
				emit: async (items) => {
					received.push(String(items[0]?.json.message));
					return { mayAdvance };
				},
			});

			try {
				const deadline = Date.now() + 60_000;
				while (received.length === 0 && Date.now() < deadline) await sleep(250);
				return received;
			} finally {
				await handle.close();
			}
		};

		// The workflow fails, so nothing may be recorded as read.
		expect(await consumeOnce(false)).toContain('must not be lost');
		// A fresh consumer in the same group still gets it: at-least-once holds.
		expect(await consumeOnce(true)).toContain('must not be lost');
	}, 180_000);
});

describe('a group the consumer can never join fails startup (ENT-340)', () => {
	let kafkajsConsumer: Consumer | undefined;

	afterEach(async () => {
		await kafkajsConsumer?.disconnect().catch(() => {});
		kafkajsConsumer = undefined;
	});

	it('rejects with the broker refusal instead of reporting a successful start', async () => {
		// Staged as the bug was found: kafkajs (v1) and librdkafka (v2) advertise
		// different partition-assignment strategy names, so whichever joins second
		// is refused with "Broker: Inconsistent group protocol" forever.
		const topic = uniqueTopic('join-refused');
		const groupId = `${topic}-group`;
		await createTopic(topic);

		// The incumbent: a kafkajs consumer holding the group, as v1 would.
		kafkajsConsumer = new Kafka({ clientId: 'ent340-v1', brokers: [credentials.brokers] }).consumer(
			{ groupId },
		);
		await kafkajsConsumer.connect();
		await kafkajsConsumer.subscribe({ topic });
		await kafkajsConsumer.run({ eachMessage: async () => {} });
		await withDeadline(
			(async () => {
				while (
					!(
						await inBroker(
							`kafka-consumer-groups --bootstrap-server localhost:9092 --describe --group ${groupId} --state`,
						)
					).includes('Stable')
				) {
					await sleep(500);
				}
			})(),
			30_000,
			'the kafkajs consumer to hold the group',
		);

		// The challenger: a v2 consumer wired the way the node wires it.
		let failStartup!: (error: Error) => void;
		const startupFailure = new Promise<never>((_, reject) => (failStartup = reject));
		void startupFailure.catch(() => {});

		const consumer = await createKafkaConsumer(
			credentials,
			{ groupId },
			{ logger, onFatalError: (error) => failStartup(error) },
		);

		const startup = consumeTopic(consumer, {
			topic,
			logger,
			parseMessage: createMessageParser({}, logger, undefined, prepareBinaryData),
			emit: async () => ({ mayAdvance: true }),
			startupFailure,
		});

		await expect(withDeadline(startup, 30_000, 'startup to settle')).rejects.toThrow(
			/inconsistent group protocol/i,
		);

		// The refused consumer must not linger in the group.
		const members = await inBroker(
			`kafka-consumer-groups --bootstrap-server localhost:9092 --describe --group ${groupId} --state`,
		);
		expect(members).toMatch(/Stable\s+1\s*$/m);
	}, 120_000);
});

describe('library logging against a real broker', () => {
	/** A library logger that records the levels the library asks it to apply. */
	const recordingLogger = (nodeLogger: Logger, onFatalError?: (error: Error) => void) => {
		const libraryLogger = createLibraryLogger(nodeLogger, onFatalError);
		const levels: number[] = [];
		const original = libraryLogger.setLogLevel.bind(libraryLogger);
		libraryLogger.setLogLevel = (level) => {
			levels.push(level);
			original(level);
		};
		return { libraryLogger, levels };
	};

	it("applies the level the real library asks for, so the client's ERROR pin takes effect", async () => {
		const nodeLogger = mock<Logger>();
		const { libraryLogger, levels } = recordingLogger(nodeLogger);

		const kafka = await createKafkaClient(credentials);
		const consumer = kafka.consumer({
			kafkaJS: { groupId: uniqueTopic('loglevel'), logger: libraryLogger },
		});
		await consumer.connect();

		try {
			// The client pins logLevel.ERROR, the library turns that into librdkafka's
			// log_level and hands the resolved level back to the logger. 1 is ERROR.
			expect(levels).toContain(1);

			// Whatever the real connect logged is not what this test is about.
			vi.mocked(nodeLogger.info).mockClear();
			vi.mocked(nodeLogger.warn).mockClear();
			vi.mocked(nodeLogger.debug).mockClear();
			vi.mocked(nodeLogger.error).mockClear();

			libraryLogger.debug('chatter');
			libraryLogger.info('chatter');
			libraryLogger.warn('chatter');
			libraryLogger.error('a real problem');

			expect(nodeLogger.debug).not.toHaveBeenCalled();
			expect(nodeLogger.info).not.toHaveBeenCalled();
			expect(nodeLogger.warn).not.toHaveBeenCalled();
			expect(nodeLogger.error).toHaveBeenCalledWith('a real problem', expect.anything());
		} finally {
			await consumer.disconnect();
		}
	});

	it('does not treat a real unreachable broker as fatal, so the library keeps retrying', async () => {
		const nodeLogger = mock<Logger>();
		const onFatalError = vi.fn();
		const { libraryLogger } = recordingLogger(nodeLogger, onFatalError);

		const kafka = await createKafkaClient({ ...credentials, brokers: 'localhost:1' });
		const consumer = kafka.consumer({
			kafkaJS: { groupId: uniqueTopic('deadbroker'), logger: libraryLogger },
		});

		try {
			// Bounded here rather than by a config key: connecting to a broker that is
			// not there is exactly the case the library keeps retrying instead of failing.
			await withDeadline(consumer.connect(), 8000, 'connect').catch(() => undefined);
			// Give librdkafka time to report the connection failures it retries through.
			await sleep(3000);

			// A broker that is down comes back. Escalating it would restart a healthy
			// trigger, which is the false positive the allowlist exists to avoid.
			expect(onFatalError).not.toHaveBeenCalled();
		} finally {
			// Measured at ~19s against a broker that never answered, which is why the
			// production close path bounds disconnect rather than awaiting it plain.
			await withDeadline(consumer.disconnect(), 5000, 'disconnect').catch(() => undefined);
		}
	}, 60_000);
});

describe('version 1 and version 2 item parity', () => {
	const baseDescription: INodeTypeBaseDescription = {
		displayName: 'Kafka Trigger',
		name: 'kafkaTrigger',
		icon: { light: 'file:kafka.svg', dark: 'file:kafka.dark.svg' },
		group: ['trigger'],
		defaultVersion: 1.3,
		description: 'Consume messages from a Kafka topic',
	};
	/** The options that shape the item, applied identically to both versions. */
	const PARSER_OPTIONS = { jsonParseMessage: true, returnHeaders: true };

	it('delivers the same item content for one message, on separate consumer groups', async () => {
		const topic = uniqueTopic('parity');
		await createTopic(topic);
		await produce(topic, JSON.stringify({ order: 42, note: 'parity' }));

		let v2Item: INodeExecutionData | undefined;
		let v2Handle: KafkaConsumerHandle | undefined;
		let v1: Awaited<ReturnType<typeof testTriggerNode>> | undefined;

		try {
			const v2Consumer = await createKafkaConsumer(credentials, {
				groupId: `${topic}-v2`,
				fromBeginning: true,
			});
			v2Handle = await consumeTopic(v2Consumer, {
				topic,
				logger,
				parseMessage: createMessageParser(PARSER_OPTIONS, logger, undefined, prepareBinaryData),
				emit: async (items) => {
					v2Item ??= items[0];
					return { mayAdvance: true };
				},
			});

			v1 = await testTriggerNode(new KafkaTriggerV1(baseDescription), {
				mode: 'trigger',
				credentials: { kafka: { ...credentials } },
				node: {
					typeVersion: 1.3,
					parameters: {
						topic,
						groupId: `${topic}-v1`,
						useSchemaRegistry: false,
						options: { ...PARSER_OPTIONS, fromBeginning: true },
					},
				},
			});

			const deadline = Date.now() + 60_000;
			while ((!v1.emit.mock.calls[0] || !v2Item) && Date.now() < deadline) await sleep(250);

			const v1Item = (v1.emit.mock.calls[0]?.[0] as INodeExecutionData[][])?.[0]?.[0];
			expect(v2Item).toEqual(v1Item);
			expect(v2Item).toEqual({
				json: { headers: {}, message: { order: 42, note: 'parity' }, topic },
			});
		} finally {
			await v2Handle?.close();
			await v1?.close();
		}
	});
});
