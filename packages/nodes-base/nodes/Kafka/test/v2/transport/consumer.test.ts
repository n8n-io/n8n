import type { Logger } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { KafkaCredentials } from '../../../utils';
import { createKafkaConsumer } from '../../../v2/transport/consumer';
import {
	confluentKafkaModuleMock,
	getFakeClientConfigs,
	getFakeConsumers,
	resetConfluentKafkaRecordings,
	type FakeConsumer,
} from '../../mocks/confluent-kafka';

vi.mock('@confluentinc/kafka-javascript', () => confluentKafkaModuleMock());

const credentials: KafkaCredentials = {
	clientId: 'n8n-test',
	brokers: 'localhost:9092',
	ssl: false,
	authentication: false,
};

beforeEach(() => {
	resetConfluentKafkaRecordings();
});

const newConsumer = async (groupId = 'n8n-kafka'): Promise<FakeConsumer> => {
	await createKafkaConsumer(credentials, { groupId });
	const consumer = getFakeConsumers().at(-1);
	if (!consumer) throw new Error('the fake recorded no consumer');
	return consumer;
};

describe('createKafkaConsumer', () => {
	it('hands the library the ENT-8 consumer defaults inside the kafkaJS wrapper key', async () => {
		const consumer = await newConsumer('my-group');

		expect(consumer.config).toStrictEqual({
			kafkaJS: {
				groupId: 'my-group',
				maxWaitTimeInMs: 5000,
				autoCommitInterval: 5000,
			},
		});
	});

	it('builds the client from the converted credential, with logging pinned to ERROR', async () => {
		await newConsumer();

		expect(getFakeClientConfigs()).toStrictEqual([
			{
				kafkaJS: {
					brokers: ['localhost:9092'],
					clientId: 'n8n-test',
					ssl: false,
					logLevel: 1,
				},
			},
		]);
	});

	it('returns a consumer that has not connected yet', async () => {
		const consumer = await newConsumer();

		expect(consumer.connect).not.toHaveBeenCalled();
		expect(consumer.subscribe).not.toHaveBeenCalled();
		expect(consumer.run).not.toHaveBeenCalled();
	});

	it('passes the v1 consumer options through alongside the defaults', async () => {
		await createKafkaConsumer(credentials, {
			groupId: 'my-group',
			sessionTimeout: 45000,
			heartbeatInterval: 9000,
			rebalanceTimeout: 700000,
			maxBytesPerPartition: 2048,
			minBytes: 2,
			maxInFlightRequests: 3,
			fromBeginning: true,
		});

		expect(getFakeConsumers().at(-1)?.config).toStrictEqual({
			kafkaJS: {
				groupId: 'my-group',
				maxWaitTimeInMs: 5000,
				autoCommitInterval: 5000,
				sessionTimeout: 45000,
				heartbeatInterval: 9000,
				rebalanceTimeout: 700000,
				maxBytesPerPartition: 2048,
				minBytes: 2,
				maxInFlightRequests: 3,
				fromBeginning: true,
			},
		});
	});

	it('gives the library a logger only when one is supplied', async () => {
		await createKafkaConsumer(credentials, { groupId: 'my-group' });
		expect(getFakeConsumers().at(-1)?.config.kafkaJS).not.toHaveProperty('logger');

		const onFatalError = vi.fn();
		await createKafkaConsumer(
			credentials,
			{ groupId: 'my-group' },
			{ logger: mock<Logger>(), onFatalError },
		);

		const libraryLogger = getFakeConsumers().at(-1)?.config.kafkaJS?.logger;
		expect(libraryLogger).toBeDefined();

		// Wired through to the handler, so the node can fail the trigger.
		libraryLogger?.error('Broker: Group authorization failed');
		expect(onFatalError).toHaveBeenCalledTimes(1);
	});

	it('omits options the user never set, rather than passing them as undefined', async () => {
		// librdkafka treats a key present with value undefined as set, skips its own
		// default, and then fails on the value.
		await createKafkaConsumer(credentials, {
			groupId: 'my-group',
			sessionTimeout: undefined,
			fromBeginning: undefined,
		});

		const config = getFakeConsumers().at(-1)?.config.kafkaJS ?? {};
		expect(Object.keys(config)).toStrictEqual(['groupId', 'maxWaitTimeInMs', 'autoCommitInterval']);
	});
});
