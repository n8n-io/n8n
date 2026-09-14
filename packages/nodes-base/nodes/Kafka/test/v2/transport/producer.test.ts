import type { KafkaJS } from '@confluentinc/kafka-javascript';

import type { KafkaCredentials } from '../../../utils';
import { getKafkaLibrary } from '../../../v2/transport/client';
import { createKafkaProducer } from '../../../v2/transport/producer';
import { confluentKafkaModuleMock } from '../../mocks/confluent-kafka';

vi.mock('@confluentinc/kafka-javascript', () => confluentKafkaModuleMock());

const CA_PEM = '-----BEGIN CERTIFICATE-----\nMIIBcacertbody==\n-----END CERTIFICATE-----';

const credentials: KafkaCredentials = {
	clientId: 'test',
	brokers: 'localhost:9092',
	ssl: false,
	authentication: false,
};

// client.ts caches the library after the first call in this file, so re-reading it
// here always returns the same `Kafka` mock constructor createKafkaProducer used.
async function kafkaConstructorMock() {
	const { Kafka } = await getKafkaLibrary();
	return vi.mocked(Kafka);
}

async function lastKafkaInstance() {
	return (await kafkaConstructorMock()).mock.results.at(-1)?.value;
}

describe('createKafkaProducer', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it.each([
		{ acks: 1, timeout: 30000 },
		{ acks: 0, timeout: 5000 },
	])('passes acks and timeout through under the kafkaJS key (%o)', async (options) => {
		await createKafkaProducer(credentials, options);

		const kafkaInstance = await lastKafkaInstance();
		expect(kafkaInstance.producer).toHaveBeenCalledWith({
			kafkaJS: { ...options, allowAutoTopicCreation: true },
		});
	});

	it('applies the optional compression codec to the producer config', async () => {
		await createKafkaProducer(credentials, {
			acks: 1,
			timeout: 30000,
			compression: 'gzip' as KafkaJS.CompressionTypes,
		});

		const kafkaInstance = await lastKafkaInstance();
		expect(kafkaInstance.producer).toHaveBeenCalledWith({
			kafkaJS: { acks: 1, timeout: 30000, allowAutoTopicCreation: true, compression: 'gzip' },
		});
	});

	it('builds the client from the credential', async () => {
		await createKafkaProducer(credentials, { acks: 1, timeout: 30000 });

		expect(await kafkaConstructorMock()).toHaveBeenCalledWith(
			expect.objectContaining({
				kafkaJS: expect.objectContaining({ brokers: ['localhost:9092'], clientId: 'test' }),
			}),
		);
	});

	it('hands the sasl and TLS material of the credential to the client', async () => {
		await createKafkaProducer(
			{
				...credentials,
				ssl: true,
				ca: CA_PEM,
				authentication: true,
				saslMechanism: 'scram-sha-512',
				username: 'user',
				password: 'pass',
			},
			{ acks: 1, timeout: 30000 },
		);

		expect(await kafkaConstructorMock()).toHaveBeenCalledWith(
			expect.objectContaining({
				kafkaJS: expect.objectContaining({
					ssl: true,
					sasl: { mechanism: 'scram-sha-512', username: 'user', password: 'pass' },
				}),
				'ssl.ca.pem': CA_PEM,
			}),
		);
	});

	it('pins the library log level so it does not write broker details to stdout', async () => {
		await createKafkaProducer(credentials, { acks: 1, timeout: 30000 });

		const { logLevel } = await getKafkaLibrary();
		expect(await kafkaConstructorMock()).toHaveBeenCalledWith(
			expect.objectContaining({
				kafkaJS: expect.objectContaining({ logLevel: logLevel.ERROR }),
			}),
		);
	});

	it('returns the client-built producer, unconnected', async () => {
		const producer = await createKafkaProducer(credentials, { acks: 1, timeout: 30000 });

		const kafkaInstance = await lastKafkaInstance();
		expect(producer).toBe(kafkaInstance.producer.mock.results[0].value);
		expect(producer.connect).not.toHaveBeenCalled();
	});
});
