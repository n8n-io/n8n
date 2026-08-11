/**
 * ENT-226 acceptance criterion 3e: when one of two consumers in the same group
 * stops cleanly, the survivor takes over its partitions, and messages published
 * after the handover each produce exactly one execution.
 *
 *   pnpm --filter n8n-nodes-base test:integration:skip ent226-3e
 */
import { createServiceStack, type N8NStack } from 'n8n-containers';
import type { IBinaryData, INodeExecutionData, ITriggerFunctions, Logger } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { KafkaCredentials } from '../../utils';
import { consumeTopic, type KafkaConsumerHandle } from '../../v2/consumer/ConsumeTopic';
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

/** Polls a broker listing until the predicate holds, or times out. */
async function waitForListing(
	command: string,
	predicate: (listing: string) => boolean,
	what: string,
	timeoutMs = 60_000,
): Promise<string> {
	const deadline = Date.now() + timeoutMs;
	let listing = '';
	while (Date.now() < deadline) {
		listing = await inBroker(command);
		if (predicate(listing)) return listing;
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}
	throw new Error(`timed out waiting for ${what}; last listing:\n${listing}`);
}

async function startMember(topic: string, groupId: string, received: string[]) {
	const consumer = await createKafkaConsumer(credentials, { groupId, fromBeginning: true });
	return await consumeTopic(consumer, {
		topic,
		logger,
		parseMessage: createMessageParser({}, logger, undefined, prepareBinaryData),
		emit: async (items: INodeExecutionData[]) => {
			for (const item of items) received.push(String((item.json as { message: string }).message));
			return { mayAdvance: true };
		},
	});
}

describe('ENT-226 3e: a surviving group member takes over cleanly released partitions', () => {
	it('the survivor owns both partitions and sees each new message exactly once', async () => {
		const topic = `ent226-3e-${Date.now()}`;
		const groupId = `${topic}-group`;
		await inBroker(
			'kafka-topics --bootstrap-server localhost:9092 --create --if-not-exists ' +
				`--partitions 2 --replication-factor 1 --topic ${topic}`,
		);

		const stateCommand = `kafka-consumer-groups --bootstrap-server localhost:9092 --describe --group ${groupId} --state`;
		const membersCommand = `kafka-consumer-groups --bootstrap-server localhost:9092 --describe --group ${groupId} --members`;
		const offsetsCommand = `kafka-consumer-groups --bootstrap-server localhost:9092 --describe --group ${groupId}`;

		const survivorReceived: string[] = [];
		const departingReceived: string[] = [];
		const survivor: KafkaConsumerHandle = await startMember(topic, groupId, survivorReceived);
		let departing: KafkaConsumerHandle | undefined = await startMember(
			topic,
			groupId,
			departingReceived,
		);

		const evidence: string[] = [];
		try {
			const withBoth = await waitForListing(
				stateCommand,
				(listing) => /Stable\s+2\s*$/m.test(listing),
				'the group to be Stable with 2 members',
			);
			evidence.push('--- both members in the group ---', withBoth);

			await departing.close();
			departing = undefined;
			const closedAt = Date.now();

			const afterHandover = await waitForListing(
				membersCommand,
				(listing) => {
					const members = listing.split('\n').filter((line) => line.includes(groupId));
					return members.length === 1 && /\s2\s*$/.test(members[0]);
				},
				'the survivor to own both partitions',
			);
			const handoverSeconds = ((Date.now() - closedAt) / 1000).toFixed(1);
			evidence.push(
				`--- after clean close of the other member (handover took ${handoverSeconds}s) ---`,
				afterHandover,
			);

			const messages = Array.from({ length: 8 }, (_, i) => `after-handover-${i}`);
			await inBroker(
				`printf '${messages.map((m, i) => `key-${i}:${m}`).join('\\n')}\\n' | ` +
					'kafka-console-producer --bootstrap-server localhost:9092 ' +
					`--topic ${topic} --property parse.key=true --property key.separator=:`,
			);

			await waitForListing(
				offsetsCommand,
				(listing) => {
					const rows = listing.split('\n').filter((line) => line.includes(topic));
					const consumed = rows
						.map((row) => Number(row.trim().split(/\s+/)[3]))
						.reduce((sum, offset) => sum + (Number.isFinite(offset) ? offset : 0), 0);
					return rows.length === 2 && consumed === messages.length;
				},
				'both partitions to be consumed to the end',
			);

			// Exactly once each: all 8 arrived at the survivor, no duplicates.
			expect([...survivorReceived].sort()).toStrictEqual([...messages].sort());
			expect(departingReceived).toStrictEqual([]);
			evidence.push(
				'--- survivor received (exactly once each) ---',
				survivorReceived.join('\n'),
				'--- committed offsets across both partitions ---',
				await inBroker(offsetsCommand),
			);

			if (process.env.ENT226_EVIDENCE_FILE) {
				const { writeFileSync } = await import('node:fs');
				writeFileSync(process.env.ENT226_EVIDENCE_FILE, evidence.join('\n'));
			}
		} finally {
			await departing?.close().catch(() => {});
			await survivor.close().catch(() => {});
		}
	}, 180_000);
});
