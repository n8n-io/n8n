/**
 * ENT-226 acceptance criterion 3b: a fatal, non-recoverable consumer error (a
 * broker authorization change) surfaces through the fatal-error handler, which
 * is what the node routes to n8n's emitError.
 *
 * This is the end-to-end proof that the real library logs an authorization
 * failure in a form the NON_RECOVERABLE patterns in LibraryLogger catch — the
 * one claim the unit tests cannot make.
 *
 *   pnpm --filter n8n-nodes-base test:integration:skip ent226-3b
 */
import { createServiceStack, type N8NStack } from 'n8n-containers';
import type { IBinaryData, INodeExecutionData, ITriggerFunctions, Logger } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { KafkaCredentials } from '../../utils';
import { consumeTopic } from '../../v2/consumer/ConsumeTopic';
import { createMessageParser } from '../../v2/consumer/MessageParser';
import { createKafkaConsumer } from '../../v2/transport/consumer';

const logger = mock<Logger>();
const prepareBinaryData = (async () =>
	mock<IBinaryData>()) as unknown as ITriggerFunctions['helpers']['prepareBinaryData'];

let stack: N8NStack;
let credentials: KafkaCredentials;
let inBroker: (command: string) => Promise<string>;

beforeAll(async () => {
	stack = await createServiceStack({ services: ['kafka'] });
	const kafka = stack.serviceResults.kafka as unknown as {
		meta: { externalBroker: string };
		container: { exec: (command: string[]) => Promise<{ output: string; exitCode: number }> };
	};

	credentials = {
		clientId: 'n8n-kafka-ent226',
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

describe('ENT-226 3b: a broker authorization change surfaces as a fatal error', () => {
	it('reaches the fatal-error handler after a deny ACL on the consumer group', async () => {
		const topic = `ent226-3b-${Date.now()}`;
		const groupId = `${topic}-group`;
		await inBroker(
			'kafka-topics --bootstrap-server localhost:9092 --create --if-not-exists ' +
				`--partitions 1 --replication-factor 1 --topic ${topic}`,
		);

		let reportFatal!: (error: Error) => void;
		const fatalError = new Promise<Error>((resolve) => (reportFatal = resolve));

		let deliver!: (item: INodeExecutionData) => void;
		const firstItem = new Promise<INodeExecutionData>((resolve) => (deliver = resolve));

		const consumer = await createKafkaConsumer(
			credentials,
			{ groupId, fromBeginning: true },
			{ logger, onFatalError: reportFatal },
		);

		const handle = await consumeTopic(consumer, {
			topic,
			logger,
			parseMessage: createMessageParser({}, logger, undefined, prepareBinaryData),
			emit: async (items) => {
				if (items[0]) deliver(items[0]);
				return { mayAdvance: true };
			},
		});

		try {
			// Healthy first: the consumer is in the group and receiving, so the
			// failure below is unambiguously caused by the ACL change.
			await inBroker(
				`echo 'before deny' | kafka-console-producer --bootstrap-server localhost:9092 --topic ${topic}`,
			);
			await expect(withDeadline(firstItem, 60_000, 'the healthy message')).resolves.toStrictEqual({
				json: { message: 'before deny', topic },
			});

			await inBroker(
				'kafka-acls --bootstrap-server localhost:9092 --add ' +
					`--deny-principal User:ANONYMOUS --operation All --group ${groupId} --force`,
			);
			const deniedAt = Date.now();

			const error = await withDeadline(fatalError, 60_000, 'the fatal-error handler');
			expect(error.message).toMatch(/authorization failed/i);

			if (process.env.ENT226_EVIDENCE_FILE) {
				const { writeFileSync } = await import('node:fs');
				writeFileSync(
					process.env.ENT226_EVIDENCE_FILE,
					`fatal handler fired ${((Date.now() - deniedAt) / 1000).toFixed(1)}s after the deny ACL\n` +
						`error message: ${error.message}\n`,
				);
			}
		} finally {
			await inBroker(
				'kafka-acls --bootstrap-server localhost:9092 --remove ' +
					`--deny-principal User:ANONYMOUS --operation All --group ${groupId} --force`,
			).catch(() => {});
			await handle.close().catch(() => {});
		}
	}, 120_000);
});
