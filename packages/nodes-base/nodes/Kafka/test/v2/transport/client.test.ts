import { UserError } from '@n8n/errors';

import type { KafkaCredentials } from '../../../utils';
import { createKafkaClient, getKafkaLibrary } from '../../../v2/transport/client';
import {
	confluentKafkaModuleMock,
	getConfluentKafkaAccessCount,
	resetConfluentKafkaAccessCount,
} from '../../mocks/confluent-kafka';

const { generateMskIamToken } = vi.hoisted(() => ({ generateMskIamToken: vi.fn() }));

vi.mock('@confluentinc/kafka-javascript', () => confluentKafkaModuleMock());
vi.mock('../../../v2/transport/msk-iam', () => ({ generateMskIamToken }));

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

describe('createKafkaClient with AWS MSK IAM', () => {
	const credentials: KafkaCredentials = {
		clientId: 'test',
		brokers: 'b-1.example.kafka.eu-central-1.amazonaws.com:9098',
		ssl: true,
		authentication: true,
		saslMechanism: 'aws-msk-iam',
		awsRegion: 'eu-central-1',
		awsAccessKeyId: 'AKIDEXAMPLE',
		awsSecretAccessKey: 'secret',
	};

	beforeEach(() => {
		generateMskIamToken.mockReset();
	});

	it('signs a token before creating the client', async () => {
		generateMskIamToken.mockResolvedValue({ value: 't', principal: 'p', lifetime: 1 });

		await createKafkaClient(credentials);

		expect(generateMskIamToken).toHaveBeenCalledWith(credentials);
	});

	it('passes on a token error, which the library would hide behind a transport failure', async () => {
		const disabled = new UserError(
			'Access to AWS system credentials disabled, contact your administrator.',
		);
		generateMskIamToken.mockRejectedValue(disabled);

		await expect(createKafkaClient({ ...credentials, awsUseSystemCredentials: true })).rejects.toBe(
			disabled,
		);
	});

	it('does not sign a token for other mechanisms', async () => {
		await createKafkaClient({
			clientId: 'test',
			brokers: 'localhost:9092',
			ssl: false,
			authentication: true,
			saslMechanism: 'plain',
			username: 'user',
			password: 'pass',
		});

		expect(generateMskIamToken).not.toHaveBeenCalled();
	});
});
