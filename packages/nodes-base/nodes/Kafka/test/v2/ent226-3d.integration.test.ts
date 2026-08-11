/**
 * ENT-226 acceptance criterion 3d: deactivating while the broker is unreachable
 * completes within the disconnect timeout (30s) instead of hanging.
 *
 * The broker is made unreachable with `docker pause`: the process freezes but
 * the TCP connections stay open, so requests hang — the worst case for a
 * disconnect, and the one the bound exists for.
 *
 *   pnpm --filter n8n-nodes-base test:integration:skip ent226-3d
 */
import { createServiceStack, type N8NStack } from 'n8n-containers';
import type { IBinaryData, ITriggerFunctions, Logger } from 'n8n-workflow';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mock } from 'vitest-mock-extended';

import type { KafkaCredentials } from '../../utils';
import { consumeTopic } from '../../v2/consumer/ConsumeTopic';
import { createMessageParser } from '../../v2/consumer/MessageParser';
import { createKafkaConsumer } from '../../v2/transport/consumer';

const run = promisify(execFile);
const logger = mock<Logger>();
const prepareBinaryData = (async () =>
	mock<IBinaryData>()) as unknown as ITriggerFunctions['helpers']['prepareBinaryData'];

let stack: N8NStack;
let credentials: KafkaCredentials;
let containerName: string;
let inBroker: (command: string) => Promise<string>;

beforeAll(async () => {
	stack = await createServiceStack({ services: ['kafka'] });
	const kafka = stack.serviceResults.kafka as unknown as {
		meta: { externalBroker: string };
		container: {
			getName: () => string;
			exec: (command: string[]) => Promise<{ output: string; exitCode: number }>;
		};
	};

	containerName = kafka.container.getName().replace(/^\//, '');
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
	// Unpause before stop, in case an assertion failed between pause and unpause.
	await run('docker', ['unpause', containerName]).catch(() => {});
	await stack?.stop();
});

describe('ENT-226 3d: deactivation with an unreachable broker stays bounded', () => {
	it('close() settles within the disconnect timeout while the broker is frozen', async () => {
		const topic = `ent226-3d-${Date.now()}`;
		await inBroker(
			'kafka-topics --bootstrap-server localhost:9092 --create --if-not-exists ' +
				`--partitions 1 --replication-factor 1 --topic ${topic}`,
		);

		const consumer = await createKafkaConsumer(credentials, {
			groupId: `${topic}-group`,
			fromBeginning: true,
		});
		const handle = await consumeTopic(consumer, {
			topic,
			logger,
			parseMessage: createMessageParser({}, logger, undefined, prepareBinaryData),
			emit: async () => ({ mayAdvance: true }),
		});

		await run('docker', ['pause', containerName]);
		const startedAt = Date.now();
		let outcome: string;
		try {
			// The v2 node maps a rejection here to a warning-level TriggerCloseError;
			// what 3d requires is that close settles at all, within the bound.
			await handle.close();
			outcome = 'close() resolved cleanly';
		} catch (error) {
			outcome = `close() rejected: ${(error as Error).message}`;
		} finally {
			await run('docker', ['unpause', containerName]);
		}
		const elapsed = (Date.now() - startedAt) / 1000;

		if (process.env.ENT226_EVIDENCE_FILE) {
			const { writeFileSync } = await import('node:fs');
			writeFileSync(
				process.env.ENT226_EVIDENCE_FILE,
				`broker paused, then close() called\n${outcome} after ${elapsed.toFixed(1)}s (bound: 30s)\n`,
			);
		}

		// 35s = the 30s disconnect bound plus slack; a hang fails here.
		expect(elapsed).toBeLessThan(35);
	}, 120_000);
});
