/**
 * Runs against the local Kafka stack from ENT-46 (payday-infrastructure,
 * `third-party-deps-containerized/kafka`), not in CI: `*.integration.test.ts` is
 * excluded from the default vitest run.
 *
 *   make up KAFKA_AUTH=none REGISTRY_AUTH=none
 *   pnpm --filter n8n-nodes-base test:integration:skip kafka-consumer
 *
 * The compressed messages are produced by `kafka-console-producer` inside the
 * broker container: none of our own libraries can produce all four codecs.
 * Each block skips itself when the service it needs is not reachable.
 */
import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import type { IBinaryData, INodeExecutionData, ITriggerFunctions, Logger } from 'n8n-workflow';
import { execFile } from 'node:child_process';
import { connect } from 'node:net';
import { promisify } from 'node:util';
import { mock } from 'vitest-mock-extended';

import type { KafkaCredentials } from '../../../utils';
import { consumeTopic } from '../../../v2/consumer/consume-topic';
import { createKafkaConsumer } from '../../../v2/transport/consumer';
import {
	createMessageParser,
	type KafkaMessageParserOptions,
} from '../../../v2/consumer/message-parser';

const execFileAsync = promisify(execFile);

const BOOTSTRAP = process.env.KAFKA_BOOTSTRAP ?? '127.0.0.1:29092';
const BROKER_CONTAINER = process.env.KAFKA_BROKER_CONTAINER ?? 'kafka-broker';
const REGISTRY_CONTAINER = process.env.KAFKA_REGISTRY_CONTAINER ?? 'kafka-schema-registry';
const REGISTRY_URL = process.env.KAFKA_SCHEMA_REGISTRY ?? 'http://127.0.0.1:8081';
/** The broker's in-network listener, for commands run inside a container. */
const INTERNAL_BOOTSTRAP = 'broker:9092';

const credentials: KafkaCredentials = {
	clientId: 'n8n-kafka-integration',
	brokers: BOOTSTRAP,
	ssl: false,
	authentication: false,
};

const BINARY: IBinaryData = { data: '', mimeType: 'application/octet-stream' };
const logger = mock<Logger>();
const prepareBinaryData = (async () =>
	BINARY) as unknown as ITriggerFunctions['helpers']['prepareBinaryData'];

async function isPortOpen(hostPort: string): Promise<boolean> {
	const [host, port] = hostPort.split(':');
	return await new Promise((resolve) => {
		const socket = connect({ host, port: Number(port) })
			.setTimeout(2000)
			.on('connect', () => {
				socket.destroy();
				resolve(true);
			})
			.on('error', () => resolve(false))
			.on('timeout', () => {
				socket.destroy();
				resolve(false);
			});
	});
}

async function isRegistryUp(): Promise<boolean> {
	try {
		const response = await fetch(`${REGISTRY_URL}/subjects`, {
			signal: AbortSignal.timeout(2000),
		});
		return response.ok;
	} catch {
		return false;
	}
}

async function inContainer(container: string, args: string[], stdin?: string): Promise<string> {
	const child = execFileAsync('docker', ['exec', '-i', container, ...args]);
	if (stdin !== undefined) {
		child.child.stdin?.end(`${stdin}\n`);
	}
	const { stdout } = await child;
	return stdout;
}

async function createTopic(topic: string): Promise<void> {
	await inContainer(BROKER_CONTAINER, [
		'kafka-topics',
		'--bootstrap-server',
		INTERNAL_BOOTSTRAP,
		'--create',
		'--if-not-exists',
		'--partitions',
		'1',
		'--replication-factor',
		'1',
		'--topic',
		topic,
	]);
}

async function produce(topic: string, message: string, codec?: string): Promise<void> {
	await inContainer(
		BROKER_CONTAINER,
		[
			'kafka-console-producer',
			'--bootstrap-server',
			INTERNAL_BOOTSTRAP,
			'--topic',
			topic,
			...(codec ? ['--compression-codec', codec] : []),
		],
		message,
	);
}

const AVRO_SCHEMA =
	'{"type":"record","name":"Demo","fields":[{"name":"msg","type":"string"},{"name":"count","type":"int"}]}';

async function produceAvro(topic: string, message: string): Promise<void> {
	await inContainer(
		REGISTRY_CONTAINER,
		[
			'kafka-avro-console-producer',
			'--bootstrap-server',
			INTERNAL_BOOTSTRAP,
			'--topic',
			topic,
			'--property',
			'schema.registry.url=http://localhost:8081',
			'--property',
			`value.schema=${AVRO_SCHEMA}`,
		],
		message,
	);
}

/**
 * Starts the consumer and waits until the broker has actually assigned it the
 * partition, so a message produced afterwards cannot be missed by a group that
 * starts at the latest offset.
 */
async function startConsumer(
	topic: string,
	parserOptions: KafkaMessageParserOptions = {},
	registry?: SchemaRegistry,
) {
	const consumer = await createKafkaConsumer(credentials, { groupId: `${topic}-group` });

	let deliver!: (item: INodeExecutionData) => void;
	const firstItem = new Promise<INodeExecutionData>((resolve) => (deliver = resolve));

	const handle = await consumeTopic(consumer, {
		topic,
		parseMessage: createMessageParser(parserOptions, logger, registry, prepareBinaryData),
		onBatch: ({ items, done }) => {
			if (items[0]) deliver(items[0]);
			done();
		},
	});

	const deadline = Date.now() + 30_000;
	while (consumer.assignment().length === 0) {
		if (Date.now() > deadline) throw new Error(`no partition assigned for ${topic}`);
		await new Promise((resolve) => setTimeout(resolve, 250));
	}

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

const uniqueTopic = (prefix: string) => `n8n-v2-${prefix}-${Date.now()}`;

const brokerUp = await isPortOpen(BOOTSTRAP);
const registryUp = brokerUp && (await isRegistryUp());

describe.skipIf(!brokerUp)('v2 consumer against a real broker', () => {
	// librdkafka 2.14.2 reports gzip, snappy, lz4 and zstd in its feature list, so
	// none of these is skipped. Re-check `require('@confluentinc/kafka-javascript').features`
	// if a codec here starts failing after a binary bump.
	it.each(['gzip', 'snappy', 'lz4', 'zstd'])(
		'receives and parses a %s-compressed message with no compression configuration',
		async (codec) => {
			const topic = uniqueTopic(codec);
			await createTopic(topic);

			const { handle, firstItem } = await startConsumer(topic, { jsonParseMessage: true });
			try {
				await produce(topic, JSON.stringify({ codec }), codec);

				await expect(withDeadline(firstItem, 60_000, `${codec} message`)).resolves.toStrictEqual({
					json: { message: { codec }, topic },
				});
			} finally {
				await handle.close();
			}
		},
	);

	it('receives an uncompressed message in version 1 item shape', async () => {
		const topic = uniqueTopic('plain');
		await createTopic(topic);

		const { handle, firstItem } = await startConsumer(topic);
		try {
			await produce(topic, 'hello from v2');

			const item = await withDeadline(firstItem, 60_000, 'plain message');

			expect(item).toStrictEqual({ json: { message: 'hello from v2', topic } });
			expect(Object.keys(item.json)).not.toContain('key');
			expect(Object.keys(item.json)).not.toContain('timestamp');
		} finally {
			await handle.close();
		}
	});
});

describe.skipIf(!registryUp)('v2 consumer with the Schema Registry', () => {
	it('decodes an Avro message registered in the registry', async () => {
		const topic = uniqueTopic('avro');
		await createTopic(topic);

		const registry = new SchemaRegistry({ host: REGISTRY_URL });
		const { handle, firstItem } = await startConsumer(topic, {}, registry);
		try {
			await produceAvro(topic, JSON.stringify({ msg: 'hello avro', count: 7 }));

			// toEqual, not toStrictEqual: the registry client hands back an avsc record
			// instance (class `Demo`) rather than a plain object, exactly as it does for v1.
			await expect(withDeadline(firstItem, 60_000, 'avro message')).resolves.toEqual({
				json: { message: { msg: 'hello avro', count: 7 }, topic },
			});
		} finally {
			await handle.close();
		}
	});
});
