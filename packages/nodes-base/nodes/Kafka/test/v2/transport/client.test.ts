import { getKafkaLibrary } from '../../../v2/transport/client';
import {
	confluentKafkaModuleMock,
	getConfluentKafkaAccessCount,
	resetConfluentKafkaAccessCount,
} from '../../mocks/confluent-kafka';

vi.mock('@confluentinc/kafka-javascript', () => confluentKafkaModuleMock());

// accessCount is module-level state shared across every test in this file — reset
// it so a future test case added here doesn't inherit another test's count.
beforeEach(() => {
	resetConfluentKafkaAccessCount();
});

it('loads the library lazily and caches the result', async () => {
	expect(getConfluentKafkaAccessCount()).toBe(0);
	const first = await getKafkaLibrary();
	expect(getConfluentKafkaAccessCount()).toBe(1);
	const second = await getKafkaLibrary();
	expect(getConfluentKafkaAccessCount()).toBe(1);
	expect(second).toBe(first);
});
