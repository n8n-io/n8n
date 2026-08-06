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
import { createKafkaConsumer } from '../../v2/transport/consumer';

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
			return { success: true };
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
					return { success: true };
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
