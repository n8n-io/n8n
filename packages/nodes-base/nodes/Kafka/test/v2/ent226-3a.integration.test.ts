/**
 * ENT-226 acceptance criterion 3a: deactivating an active v2 trigger removes
 * its consumer from the group, verified with the broker's own consumer-group
 * listing (kafka-consumer-groups --describe).
 *
 *   pnpm --filter n8n-nodes-base test:integration:skip ent226-3a
 */
import { createServiceStack, type N8NStack } from 'n8n-containers';
import type { IBinaryData, ITriggerFunctions, Logger } from 'n8n-workflow';
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

const describeGroup = async (groupId: string) =>
	await inBroker(
		`kafka-consumer-groups --bootstrap-server localhost:9092 --describe --group ${groupId} --state`,
	);

/** Polls the broker's group listing until the predicate holds, or times out. */
async function waitForGroupState(
	groupId: string,
	predicate: (listing: string) => boolean,
	what: string,
	timeoutMs = 30_000,
): Promise<string> {
	const deadline = Date.now() + timeoutMs;
	let listing = '';
	while (Date.now() < deadline) {
		listing = await describeGroup(groupId);
		if (predicate(listing)) return listing;
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}
	throw new Error(`timed out waiting for ${what}; last listing:\n${listing}`);
}

describe('ENT-226 3a: clean deactivation removes the consumer from its group', () => {
	it('shows a Stable member while active, and an Empty group after close', async () => {
		const topic = `ent226-3a-${Date.now()}`;
		const groupId = `${topic}-group`;
		await inBroker(
			'kafka-topics --bootstrap-server localhost:9092 --create --if-not-exists ' +
				`--partitions 1 --replication-factor 1 --topic ${topic}`,
		);

		const evidence: string[] = [];
		const consumer = await createKafkaConsumer(credentials, { groupId, fromBeginning: true });
		const handle = await consumeTopic(consumer, {
			topic,
			logger,
			parseMessage: createMessageParser({}, logger, undefined, prepareBinaryData),
			emit: async () => ({ mayAdvance: true }),
		});

		try {
			const before = await waitForGroupState(
				groupId,
				(listing) =>
					/Stable/.test(listing) && !/#MEMBERS\s*[\r\n]+\S+\s+\S+\s+\S+\s+0/.test(listing),
				'the group to become Stable with a member',
			);
			expect(before).toMatch(/Stable/);
			evidence.push('--- BEFORE close ---', before);
		} finally {
			await handle.close();
		}

		const after = await waitForGroupState(
			groupId,
			(listing) => /Empty/.test(listing),
			'the group to become Empty after close',
		);
		evidence.push('--- AFTER close ---', after);
		expect(after).toMatch(/Empty/);

		if (process.env.ENT226_EVIDENCE_FILE) {
			const { writeFileSync } = await import('node:fs');
			writeFileSync(process.env.ENT226_EVIDENCE_FILE, evidence.join('\n'));
		}
	}, 120_000);
});
