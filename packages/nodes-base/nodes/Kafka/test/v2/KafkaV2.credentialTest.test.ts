import type {
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	INodeTypeBaseDescription,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { KafkaV2 } from '../../v2/KafkaV2.node';
import { getKafkaLibrary } from '../../v2/transport/client';
import {
	confluentKafkaModuleMock,
	getFakeAdmins,
	getFakeClientConfigs,
	resetConfluentKafkaRecordings,
} from '../mocks/confluent-kafka';

// Same reasoning as the other v2 test files: the node is imported directly (through
// vite) so vi.mock can intercept its library imports.
vi.mock('@confluentinc/kafka-javascript', () => confluentKafkaModuleMock());

// The shared `utils.ts` pulls kafkajs in statically. Stubbed so v1's library is never
// actually loaded by a v2 test.
vi.mock('kafkajs', () => ({
	logLevel: { NOTHING: 0, ERROR: 1, WARN: 2, INFO: 3, DEBUG: 4 },
}));

const baseDescription: INodeTypeBaseDescription = {
	displayName: 'Kafka',
	name: 'kafka',
	group: ['transform'],
	description: 'Sends messages to a Kafka topic',
};

const validCredential = {
	clientId: 'n8n',
	brokers: 'broker-1:9092, broker-2:9092',
	ssl: false,
	authentication: true,
	username: 'user',
	password: 'pass',
	saslMechanism: 'plain',
};

// A plain literal rather than `mock<ICredentialsDecrypted>`: an auto-mocked optional
// field (`cert`, `key`, `ca`) is a truthy proxy, so every credential would look like it
// carries mTLS material and the conversion would never see a real absent value.
const runTest = async (data: ICredentialDataDecryptedObject) => {
	const node = new KafkaV2(baseDescription);
	const credential = { id: '1', name: 'Kafka account', type: 'kafka', data };

	return await node.methods.credentialTest.kafkaConnectionTest.call(
		mock<ICredentialTestFunctions>(),
		credential as ICredentialsDecrypted,
	);
};

beforeEach(() => {
	resetConfluentKafkaRecordings();
	vi.clearAllMocks();
});

it('connects through the library the node executes with', async () => {
	const result = await runTest(validCredential);

	expect(result).toEqual({ status: 'OK', message: 'Authentication successful' });

	// Asserting on the config proves the credential went through v2's own conversion
	// rather than a second, drifting copy: brokers split and trimmed, SASL mapped into
	// the `kafkaJS` block.
	const [config] = getFakeClientConfigs();
	expect(config.kafkaJS).toMatchObject({
		brokers: ['broker-1:9092', 'broker-2:9092'],
		clientId: 'n8n',
		sasl: { mechanism: 'plain', username: 'user', password: 'pass' },
	});
});

// The library's `connect()` resolves without contacting a broker, so a test that stops
// there reports any address as valid. These two pin the metadata request that makes the
// result mean something.
it('requests cluster metadata rather than trusting connect()', async () => {
	await runTest(validCredential);

	const [admin] = getFakeAdmins();
	expect(admin.listTopics).toHaveBeenCalledWith({ timeout: expect.any(Number) });
});

it('fails when the broker is unreachable, even though connect() resolved', async () => {
	const { Kafka } = await getKafkaLibrary();
	vi.mocked(Kafka).mockImplementationOnce(function () {
		return {
			admin: () => ({
				connect: async () => {},
				listTopics: async () => {
					throw new Error('Local: Broker transport failure');
				},
				disconnect: async () => {},
			}),
		} as unknown as InstanceType<typeof Kafka>;
	});

	await expect(runTest(validCredential)).resolves.toEqual({
		status: 'Error',
		message: 'Local: Broker transport failure',
	});
});

it('disconnects the admin client it opened', async () => {
	await runTest(validCredential);

	const [admin] = getFakeAdmins();
	expect(admin.connect).toHaveBeenCalledTimes(1);
	expect(admin.disconnect).toHaveBeenCalledTimes(1);
});

it('reports the broker error when the connection is refused', async () => {
	const { Kafka } = await getKafkaLibrary();
	vi.mocked(Kafka).mockImplementationOnce(function () {
		return {
			admin: () => ({
				connect: async () => {
					throw new Error('broker transport failure');
				},
				disconnect: async () => {},
			}),
		} as unknown as InstanceType<typeof Kafka>;
	});

	await expect(runTest(validCredential)).resolves.toEqual({
		status: 'Error',
		message: 'broker transport failure',
	});
});

it('reports an invalid credential without opening a connection', async () => {
	// A client certificate with no private key is rejected during conversion, before any
	// I/O — it has to surface as a failed test rather than an unhandled throw.
	const result = await runTest({
		...validCredential,
		ssl: true,
		cert: '-----BEGIN CERTIFICATE-----\nabc\n-----END CERTIFICATE-----',
	});

	expect(result.status).toBe('Error');
	expect(result.message).toContain('client certificate and a client private key');
	expect(getFakeClientConfigs()).toHaveLength(0);
});

it('still passes when only the disconnect fails', async () => {
	const { Kafka } = await getKafkaLibrary();
	vi.mocked(Kafka).mockImplementationOnce(function () {
		return {
			admin: () => ({
				connect: async () => {},
				listTopics: async () => [],
				disconnect: async () => {
					throw new Error('disconnect timed out');
				},
			}),
		} as unknown as InstanceType<typeof Kafka>;
	});

	await expect(runTest(validCredential)).resolves.toEqual({
		status: 'OK',
		message: 'Authentication successful',
	});
});
