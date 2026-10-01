// Static import of the entry file, not a version file directly: constructing
// `KafkaTrigger` builds every registered version's class (KafkaTriggerV1 x4
// AND KafkaTriggerV2), which is the scenario that must not touch the new
// library. The node is imported directly (through vite), not via
// NodeTestHarness (which loads from dist via require()), so vi.mock can
// intercept its imports - same reasoning as test/v2/KafkaV2.node.test.ts.
import { testTriggerNode } from '@test/nodes/TriggerHelpers';

import { KafkaTrigger } from '../../KafkaTrigger.node';
import {
	confluentKafkaModuleMock,
	getConfluentKafkaAccessCount,
	resetConfluentKafkaAccessCount,
} from '../mocks/confluent-kafka';

vi.mock('@confluentinc/kafka-javascript', () => confluentKafkaModuleMock());

// A minimal but complete kafkajs consumer: v1's trigger() registers event
// listeners via consumer.on/consumer.events, so a bare vi.mock('kafkajs')
// automock (whose methods return undefined) fails before the loop even
// starts. This test only needs v1 to activate successfully, not to receive
// a message.
vi.mock('kafkajs', () => {
	const events = {
		CONNECT: 'consumer.connect',
		GROUP_JOIN: 'consumer.group_join',
		REQUEST_TIMEOUT: 'consumer.network.request_timeout',
		RECEIVED_UNSUBSCRIBED_TOPICS: 'consumer.received_unsubscribed_topics',
		STOP: 'consumer.stop',
		DISCONNECT: 'consumer.disconnect',
		COMMIT_OFFSETS: 'consumer.commit_offsets',
		REBALANCING: 'consumer.rebalancing',
		CRASH: 'consumer.crash',
	};
	const consumer = {
		connect: vi.fn(async () => {}),
		subscribe: vi.fn(async () => {}),
		run: vi.fn(async () => {}),
		stop: vi.fn(async () => {}),
		disconnect: vi.fn(async () => {}),
		on: vi.fn(() => vi.fn()),
		events,
	};
	// A function expression, not an arrow: v1 calls `new Kafka(...)`, and an
	// arrow implementation is not constructible.
	return {
		Kafka: vi.fn(function () {
			return { consumer: vi.fn(() => consumer) };
		}),
		logLevel: { NOTHING: 0, ERROR: 1, WARN: 2, INFO: 3, DEBUG: 4 },
	};
});

beforeEach(() => {
	resetConfluentKafkaAccessCount();
});

it('running a version 1 trigger never loads the new confluent-kafka library', async () => {
	const entry = new KafkaTrigger();
	const v1 = entry.nodeVersions[1];

	expect(getConfluentKafkaAccessCount()).toBe(0);

	const { close } = await testTriggerNode(v1, {
		mode: 'trigger',
		node: {
			typeVersion: 1,
			parameters: {
				topic: 'isolation-topic',
				groupId: 'isolation-test-group-v1',
				useSchemaRegistry: false,
			},
		},
		credential: {
			brokers: 'localhost:9092',
			clientId: 'n8n-isolation-test',
			ssl: false,
			authentication: false,
		},
	});

	expect(getConfluentKafkaAccessCount()).toBe(0);

	await close();

	expect(getConfluentKafkaAccessCount()).toBe(0);
});
