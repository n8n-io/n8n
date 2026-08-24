import type { KafkaCredentials } from '../../../utils';
// Static imports, on purpose: the assertion below is that pulling the consumer
// modules into a process does not pull the native library in with them.
import '../../../v2/consumer';
import { createKafkaConsumer } from '../../../v2/transport/consumer';
import {
	confluentKafkaModuleMock,
	getConfluentKafkaAccessCount,
} from '../../mocks/confluent-kafka';

vi.mock('@confluentinc/kafka-javascript', () => confluentKafkaModuleMock());

const credentials: KafkaCredentials = {
	clientId: 'n8n-test',
	brokers: 'localhost:9092',
	ssl: false,
	authentication: false,
};

it('reaches the library only through the transport lazy loader', async () => {
	expect(getConfluentKafkaAccessCount()).toBe(0);

	await createKafkaConsumer(credentials, { groupId: 'n8n-kafka' });

	expect(getConfluentKafkaAccessCount()).toBe(1);
});
