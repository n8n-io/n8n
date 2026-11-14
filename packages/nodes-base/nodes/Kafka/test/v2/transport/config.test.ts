import { UserError } from '@n8n/errors';

import type { KafkaCredentials } from '../../../utils';
import { toKafkaJSConfig } from '../../../v2/transport/config';

const { kafkajsLoadCount, generateMskIamToken } = vi.hoisted(() => ({
	kafkajsLoadCount: { value: 0 },
	generateMskIamToken: vi.fn(),
}));

vi.mock('../../../v2/transport/msk-iam', () => ({ generateMskIamToken }));

// Counts module loads rather than property reads: this file's import graph reaches
// `utils.ts` for a value (the shared PEM validator), which only stays free of v1's
// library because `utils.ts` imports it lazily. A static import there trips this.
vi.mock('kafkajs', () => {
	kafkajsLoadCount.value += 1;
	return { logLevel: { NOTHING: 0, ERROR: 1, WARN: 2, INFO: 4, DEBUG: 5 } };
});

const CERT_PEM = '-----BEGIN CERTIFICATE-----\nMIIBclientcertbody==\n-----END CERTIFICATE-----';
const KEY_PEM = '-----BEGIN PRIVATE KEY-----\nMIIBclientkeybody==\n-----END PRIVATE KEY-----';
const CA_PEM = '-----BEGIN CERTIFICATE-----\nMIIBcacertbody==\n-----END CERTIFICATE-----';

const creds = (overrides: Partial<KafkaCredentials> = {}): KafkaCredentials => ({
	clientId: 'test',
	brokers: 'localhost:9092',
	ssl: false,
	authentication: false,
	...overrides,
});

describe('toKafkaJSConfig', () => {
	it('returns brokers/clientId/ssl only when authentication and SSL are both off', () => {
		expect(toKafkaJSConfig(creds())).toStrictEqual({
			kafkaJS: { brokers: ['localhost:9092'], clientId: 'test', ssl: false },
		});
	});

	it.each(['plain', 'scram-sha-256', 'scram-sha-512'] as const)(
		'adds kafkaJS.sasl for SASL mechanism %s, with SSL off',
		(saslMechanism) => {
			expect(
				toKafkaJSConfig(
					creds({ authentication: true, saslMechanism, username: 'user', password: 'pass' }),
				),
			).toStrictEqual({
				kafkaJS: {
					brokers: ['localhost:9092'],
					clientId: 'test',
					ssl: false,
					sasl: { mechanism: saslMechanism, username: 'user', password: 'pass' },
				},
			});
		},
	);

	it.each(['plain', 'scram-sha-256', 'scram-sha-512'] as const)(
		'adds kafkaJS.sasl for SASL mechanism %s, with SSL on and no cert material',
		(saslMechanism) => {
			expect(
				toKafkaJSConfig(
					creds({
						ssl: true,
						authentication: true,
						saslMechanism,
						username: 'user',
						password: 'pass',
					}),
				),
			).toStrictEqual({
				kafkaJS: {
					brokers: ['localhost:9092'],
					clientId: 'test',
					ssl: true,
					sasl: { mechanism: saslMechanism, username: 'user', password: 'pass' },
				},
			});
		},
	);

	it('defaults kafkaJS.sasl.mechanism to plain when saslMechanism is omitted', () => {
		const result = toKafkaJSConfig(
			creds({ authentication: true, username: 'user', password: 'pass' }),
		);

		expect(result.kafkaJS?.sasl).toStrictEqual({
			mechanism: 'plain',
			username: 'user',
			password: 'pass',
		});
	});

	it('returns ssl: true with no flat TLS keys when SSL is on with no cert material', () => {
		expect(toKafkaJSConfig(creds({ ssl: true }))).toStrictEqual({
			kafkaJS: { brokers: ['localhost:9092'], clientId: 'test', ssl: true },
		});
	});

	it('sets ssl.ca.pem alone when only a CA certificate is provided (no mTLS)', () => {
		expect(toKafkaJSConfig(creds({ ssl: true, ca: CA_PEM }))).toStrictEqual({
			kafkaJS: { brokers: ['localhost:9092'], clientId: 'test', ssl: true },
			'ssl.ca.pem': CA_PEM,
		});
	});

	it('sets ssl.certificate.pem and ssl.key.pem when cert and key are both provided (mTLS)', () => {
		expect(toKafkaJSConfig(creds({ ssl: true, cert: CERT_PEM, key: KEY_PEM }))).toStrictEqual({
			kafkaJS: { brokers: ['localhost:9092'], clientId: 'test', ssl: true },
			'ssl.certificate.pem': CERT_PEM,
			'ssl.key.pem': KEY_PEM,
		});
	});

	it('throws when a client certificate is provided without a private key', () => {
		expect(() => toKafkaJSConfig(creds({ ssl: true, cert: CERT_PEM }))).toThrow(UserError);
		expect(() => toKafkaJSConfig(creds({ ssl: true, cert: CERT_PEM }))).toThrow(
			'Kafka mTLS needs both a client certificate and a client private key',
		);
	});

	it('throws when a client private key is provided without a certificate', () => {
		expect(() => toKafkaJSConfig(creds({ ssl: true, key: KEY_PEM }))).toThrow(UserError);
		expect(() => toKafkaJSConfig(creds({ ssl: true, key: KEY_PEM }))).toThrow(
			'Kafka mTLS needs both a client certificate and a client private key',
		);
	});

	it('sets enable.ssl.certificate.verification: false when allowUnauthorizedCerts is true', () => {
		expect(toKafkaJSConfig(creds({ ssl: true, allowUnauthorizedCerts: true }))).toStrictEqual({
			kafkaJS: { brokers: ['localhost:9092'], clientId: 'test', ssl: true },
			'enable.ssl.certificate.verification': false,
		});
	});

	it('ignores allowUnauthorizedCerts when SSL is off', () => {
		const result = toKafkaJSConfig(creds({ ssl: false, allowUnauthorizedCerts: true }));

		expect(result).toStrictEqual({
			kafkaJS: { brokers: ['localhost:9092'], clientId: 'test', ssl: false },
		});
		expect(Object.keys(result)).not.toContain('enable.ssl.certificate.verification');
	});

	it('combines SASL and mTLS material, unclobbered, in the same result', () => {
		expect(
			toKafkaJSConfig(
				creds({
					ssl: true,
					cert: CERT_PEM,
					key: KEY_PEM,
					ca: CA_PEM,
					authentication: true,
					saslMechanism: 'plain',
					username: 'user',
					password: 'pass',
				}),
			),
		).toStrictEqual({
			kafkaJS: {
				brokers: ['localhost:9092'],
				clientId: 'test',
				ssl: true,
				sasl: { mechanism: 'plain', username: 'user', password: 'pass' },
			},
			'ssl.certificate.pem': CERT_PEM,
			'ssl.key.pem': KEY_PEM,
			'ssl.ca.pem': CA_PEM,
		});
	});

	it('treats empty-string cert/key/ca as absent, even with SSL on', () => {
		expect(toKafkaJSConfig(creds({ ssl: true, cert: '', key: '', ca: '' }))).toStrictEqual({
			kafkaJS: { brokers: ['localhost:9092'], clientId: 'test', ssl: true },
		});
	});

	it('throws when authentication is enabled without a username and password', () => {
		expect(() => toKafkaJSConfig(creds({ authentication: true }))).toThrow(UserError);
	});

	it.each([
		['username', { username: 'user' }],
		['password', { password: 'pass' }],
	])('throws when authentication is enabled with only a %s and no counterpart', (_, partial) => {
		expect(() => toKafkaJSConfig(creds({ authentication: true, ...partial }))).toThrow(UserError);
	});

	it('throws when a PEM value is malformed', () => {
		expect(() => toKafkaJSConfig(creds({ ssl: true, ca: 'not-a-pem-block' }))).toThrow(
			'The Kafka CA certificate is not a valid PEM block',
		);
	});

	it('splits and trims a comma-separated brokers string', () => {
		const result = toKafkaJSConfig(creds({ brokers: 'b1:9092, b2:9092 ' }));

		expect(result.kafkaJS?.brokers).toStrictEqual(['b1:9092', 'b2:9092']);
	});

	it('never loads the v1 kafkajs library', () => {
		// Exercises the PEM path, the one value imported from `utils.ts`.
		toKafkaJSConfig(creds({ ssl: true, ca: CA_PEM }));

		expect(kafkajsLoadCount.value).toBe(0);
	});
});

describe('toKafkaJSConfig with AWS MSK IAM', () => {
	const iam = (overrides: Partial<KafkaCredentials> = {}): KafkaCredentials =>
		creds({
			ssl: true,
			authentication: true,
			saslMechanism: 'aws-msk-iam',
			awsRegion: 'eu-central-1',
			awsAccessKeyId: 'AKIDEXAMPLE',
			awsSecretAccessKey: 'secret',
			...overrides,
		});

	beforeEach(() => {
		generateMskIamToken.mockReset();
	});

	it('uses OAUTHBEARER with a token provider instead of a username and password', () => {
		const result = toKafkaJSConfig(iam());

		expect(result.kafkaJS.sasl).toStrictEqual({
			mechanism: 'oauthbearer',
			oauthBearerProvider: expect.any(Function),
		});
		expect(result.kafkaJS.ssl).toBe(true);
	});

	it('does not sign a token until the library asks for one', () => {
		toKafkaJSConfig(iam());

		expect(generateMskIamToken).not.toHaveBeenCalled();
	});

	it('returns a token signed from the credential each time the library asks', async () => {
		const token = { value: 'token', principal: 'aws-msk-iam', lifetime: 1 };
		generateMskIamToken.mockResolvedValue(token);
		const credentials = iam();
		const { sasl } = toKafkaJSConfig(credentials).kafkaJS;
		if (sasl?.mechanism !== 'oauthbearer') throw new Error('expected an OAUTHBEARER config');

		await expect(sasl.oauthBearerProvider()).resolves.toBe(token);
		await sasl.oauthBearerProvider();

		expect(generateMskIamToken).toHaveBeenCalledTimes(2);
		expect(generateMskIamToken).toHaveBeenCalledWith(credentials);
	});

	it('keeps mTLS material alongside MSK IAM', () => {
		const result = toKafkaJSConfig(iam({ ca: CA_PEM }));

		expect(result['ssl.ca.pem']).toBe(CA_PEM);
	});

	it('accepts system credentials without an access key', () => {
		const result = toKafkaJSConfig(
			iam({
				awsUseSystemCredentials: true,
				awsAccessKeyId: undefined,
				awsSecretAccessKey: undefined,
			}),
		);

		expect(result.kafkaJS.sasl?.mechanism).toBe('oauthbearer');
	});

	it('throws when SSL is off', () => {
		expect(() => toKafkaJSConfig(iam({ ssl: false }))).toThrow(
			'AWS MSK IAM authentication needs SSL',
		);
	});

	it('throws without an AWS Region', () => {
		expect(() => toKafkaJSConfig(iam({ awsRegion: undefined }))).toThrow(UserError);
	});

	it.each([
		['access key ID', { awsAccessKeyId: '' }],
		['secret access key', { awsSecretAccessKey: '  ' }],
	])('throws without an %s', (_, overrides) => {
		expect(() => toKafkaJSConfig(iam(overrides))).toThrow(UserError);
	});

	it('ignores the MSK IAM mechanism when authentication is off', () => {
		const result = toKafkaJSConfig(iam({ authentication: false }));

		expect(result.kafkaJS.sasl).toBeUndefined();
	});
});
