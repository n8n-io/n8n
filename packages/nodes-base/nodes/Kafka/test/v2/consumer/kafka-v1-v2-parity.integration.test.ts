/**
 * Proves one produced message reaches the same item content through the version 1
 * trigger (kafkajs) and this consumer code (the new library), each on its own
 * consumer group. Runs against the local Kafka stack from ENT-46, not in CI.
 *
 *   make up KAFKA_AUTH=none REGISTRY_AUTH=none
 *   pnpm --filter n8n-nodes-base test:integration:skip kafka-v1-v2-parity
 */
import type {
	IBinaryData,
	INodeExecutionData,
	INodeTypeBaseDescription,
	ITriggerFunctions,
	Logger,
} from 'n8n-workflow';
import { execFile } from 'node:child_process';
import { connect } from 'node:net';
import { promisify } from 'node:util';
import { mock } from 'vitest-mock-extended';

import { testTriggerNode } from '@test/nodes/TriggerHelpers';

import type { KafkaCredentials } from '../../../utils';
import { KafkaTriggerV1 } from '../../../v1/KafkaTriggerV1.node';
import { consumeTopic, type KafkaConsumerHandle } from '../../../v2/consumer/consume-topic';
import { createKafkaConsumer } from '../../../v2/transport/consumer';
import { createMessageParser } from '../../../v2/consumer/message-parser';

const execFileAsync = promisify(execFile);

const BOOTSTRAP = process.env.KAFKA_BOOTSTRAP ?? '127.0.0.1:29092';
const BROKER_CONTAINER = process.env.KAFKA_BROKER_CONTAINER ?? 'kafka-broker';
const INTERNAL_BOOTSTRAP = 'broker:9092';

const credentials: KafkaCredentials = {
	clientId: 'n8n-kafka-parity',
	brokers: BOOTSTRAP,
	ssl: false,
	authentication: false,
};

/** The options that shape the item, applied identically to both versions. */
const PARSER_OPTIONS = { jsonParseMessage: true, returnHeaders: true };

const baseDescription: INodeTypeBaseDescription = {
	displayName: 'Kafka Trigger',
	name: 'kafkaTrigger',
	icon: { light: 'file:kafka.svg', dark: 'file:kafka.dark.svg' },
	group: ['trigger'],
	defaultVersion: 1.3,
	description: 'Consume messages from a Kafka topic',
};

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

async function inBroker(args: string[], stdin?: string): Promise<void> {
	const child = execFileAsync('docker', ['exec', '-i', BROKER_CONTAINER, ...args]);
	if (stdin !== undefined) child.child.stdin?.end(`${stdin}\n`);
	await child;
}

async function waitFor<T>(read: () => T | undefined, what: string, ms = 60_000): Promise<T> {
	const deadline = Date.now() + ms;
	for (;;) {
		const value = read();
		if (value !== undefined) return value;
		if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`);
		await new Promise((resolve) => setTimeout(resolve, 250));
	}
}

const brokerUp = await isPortOpen(BOOTSTRAP);

describe.skipIf(!brokerUp)('version 1 and version 2 item parity', () => {
	it('delivers the same item content for one message, on separate consumer groups', async () => {
		const topic = `n8n-parity-${Date.now()}`;
		await inBroker([
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

		let v2Item: INodeExecutionData | undefined;
		let v2Handle: KafkaConsumerHandle | undefined;
		let v1: Awaited<ReturnType<typeof testTriggerNode>> | undefined;

		// Everything after the first consumer exists goes in the try, so a failure
		// setting up either side still releases whatever is already connected.
		try {
			// v2 first: a fresh group starts at the latest offset, so it has to hold the
			// partition before the message is produced. v1 reads `fromBeginning`, so its
			// join can land either side of the produce.
			const v2Consumer = await createKafkaConsumer(credentials, { groupId: `${topic}-v2` });
			v2Handle = await consumeTopic(v2Consumer, {
				topic,
				parseMessage: createMessageParser(PARSER_OPTIONS, mock<Logger>(), undefined, (async () =>
					mock<IBinaryData>()) as unknown as ITriggerFunctions['helpers']['prepareBinaryData']),
				emit: async (items) => {
					v2Item ??= items[0];
					return { success: true };
				},
				logger: mock<Logger>(),
			});
			await waitFor(
				() => (v2Consumer.assignment().length > 0 ? true : undefined),
				'the v2 partition assignment',
			);

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

			await inBroker(
				['kafka-console-producer', '--bootstrap-server', INTERNAL_BOOTSTRAP, '--topic', topic],
				JSON.stringify({ order: 42, note: 'parity' }),
			);

			const v1Emit = await waitFor(() => v1?.emit.mock.calls[0], 'the v1 emit');
			const v1Item = (v1Emit[0] as INodeExecutionData[][])[0][0];
			const received = await waitFor(() => v2Item, 'the v2 item');

			// eslint-disable-next-line no-console
			console.log(
				'v1:',
				JSON.stringify(v1Item),
				'\nv2:',
				JSON.stringify(received),
				`\ngroups: ${topic}-v1 / ${topic}-v2`,
			);

			expect(received).toEqual(v1Item);
			expect(received).toEqual({
				json: { headers: {}, message: { order: 42, note: 'parity' }, topic },
			});
		} finally {
			await v2Handle?.close();
			await v1?.close();
		}
	});
});
