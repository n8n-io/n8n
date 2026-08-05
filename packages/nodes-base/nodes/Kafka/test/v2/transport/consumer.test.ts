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
});
