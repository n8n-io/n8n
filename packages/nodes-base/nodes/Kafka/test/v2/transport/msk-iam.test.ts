import { UserError } from '@n8n/errors';

import type { KafkaCredentials } from '../../../utils';
import { generateMskIamToken } from '../../../v2/transport/msk-iam';

const { getSystemCredentials } = vi.hoisted(() => ({ getSystemCredentials: vi.fn() }));

vi.mock('../../../../../credentials/common/aws/system-credentials-utils', () => ({
	getSystemCredentials,
}));

const SIGNED_AT = new Date('2026-11-14T10:20:30.456Z');

const creds = (overrides: Partial<KafkaCredentials> = {}): KafkaCredentials => ({
	clientId: 'test',
	brokers: 'b-1.example.kafka.us-east-1.amazonaws.com:9098',
	ssl: true,
	authentication: true,
	saslMechanism: 'aws-msk-iam',
	awsRegion: 'us-east-1',
	awsAccessKeyId: 'AKIDEXAMPLE',
	awsSecretAccessKey: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY',
	...overrides,
});

const decode = (token: string) => new URL(Buffer.from(token, 'base64url').toString('utf-8'));

beforeEach(() => {
	vi.clearAllMocks();
});

describe('generateMskIamToken', () => {
	it('presigns a kafka-cluster:Connect request for the regional MSK endpoint', async () => {
		const { value } = await generateMskIamToken(creds(), SIGNED_AT);
		const url = decode(value);

		expect(url.origin).toBe('https://kafka.us-east-1.amazonaws.com');
		expect(url.pathname).toBe('/');
		expect(Object.fromEntries(url.searchParams)).toStrictEqual({
			Action: 'kafka-cluster:Connect',
			'User-Agent': 'n8n-kafka-msk-iam',
			'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
			'X-Amz-Credential': 'AKIDEXAMPLE/20261114/us-east-1/kafka-cluster/aws4_request',
			'X-Amz-Date': '20261114T102030Z',
			'X-Amz-Expires': '900',
			'X-Amz-SignedHeaders': 'host',
			'X-Amz-Signature': expect.stringMatching(/^[0-9a-f]{64}$/),
		});
	});

	// Expected signatures come from AWS's aws-msk-iam-sasl-signer-js 1.0.3 with the same
	// inputs and signing time, so these pin the token to the format MSK accepts.
	it.each([
		{
			name: 'static keys',
			overrides: {},
			signature: '939e50fe4c143d4c7e0419954f655af62cf63ea05a9c9be7cc34208d7bbe2af2',
		},
		{
			name: 'a session token with reserved URL characters',
			overrides: {
				awsRegion: 'eu-central-1',
				awsAccessKeyId: 'ASIAEXAMPLE',
				awsSessionToken: 'IQoJb3JpZ2luX2VjE/a+b=c==',
			},
			signature: 'e5f150af59f504cd3a62c59de5b1fcda43597baac025b3182390404df79b5daa',
		},
	] as const)('matches the AWS reference signer for $name', async ({ overrides, signature }) => {
		const { value } = await generateMskIamToken(creds(overrides), SIGNED_AT);

		expect(decode(value).searchParams.get('X-Amz-Signature')).toBe(signature);
	});

	it('produces the same signature for the same inputs and signing time', async () => {
		const first = await generateMskIamToken(creds(), SIGNED_AT);
		const second = await generateMskIamToken(creds(), SIGNED_AT);

		expect(second.value).toBe(first.value);
	});

	it('changes the signature when the secret access key changes', async () => {
		const first = await generateMskIamToken(creds(), SIGNED_AT);
		const second = await generateMskIamToken(
			creds({ awsSecretAccessKey: 'a-different-secret' }),
			SIGNED_AT,
		);

		expect(decode(second.value).searchParams.get('X-Amz-Signature')).not.toBe(
			decode(first.value).searchParams.get('X-Amz-Signature'),
		);
	});

	it('encodes the URL as unpadded base64url', async () => {
		const { value } = await generateMskIamToken(creds(), SIGNED_AT);

		expect(value).toMatch(/^[A-Za-z0-9_-]+$/);
	});

	it('expires the token 900 seconds after the signing second', async () => {
		const token = await generateMskIamToken(creds(), SIGNED_AT);

		expect(token.lifetime).toBe(Date.parse('2026-11-14T10:20:30Z') + 900_000);
		expect(token.principal).not.toBe('');
	});

	it('signs the session token of temporary credentials', async () => {
		const { value } = await generateMskIamToken(
			creds({ awsSessionToken: 'session/token+value=' }),
			SIGNED_AT,
		);

		expect(decode(value).searchParams.get('X-Amz-Security-Token')).toBe('session/token+value=');
	});

	it('trims whitespace from pasted keys', async () => {
		const { value } = await generateMskIamToken(
			creds({ awsAccessKeyId: '  AKIDEXAMPLE\n', awsSessionToken: '   ' }),
			SIGNED_AT,
		);
		const url = decode(value);

		expect(url.searchParams.get('X-Amz-Credential')).toMatch(/^AKIDEXAMPLE\//);
		expect(url.searchParams.has('X-Amz-Security-Token')).toBe(false);
	});

	it('uses the China endpoint for a China region', async () => {
		const { value } = await generateMskIamToken(creds({ awsRegion: 'cn-north-1' }), SIGNED_AT);

		expect(decode(value).origin).toBe('https://kafka.cn-north-1.amazonaws.com.cn');
	});

	it('signs with the AWS system credentials when selected', async () => {
		getSystemCredentials.mockResolvedValue({
			accessKeyId: 'ASIASYSTEM',
			secretAccessKey: 'system-secret',
			sessionToken: 'system-session',
			source: 'roleForServiceAccount',
		});

		const { value } = await generateMskIamToken(
			creds({
				awsUseSystemCredentials: true,
				awsAccessKeyId: undefined,
				awsSecretAccessKey: undefined,
				awsRegion: 'eu-central-1',
			}),
			SIGNED_AT,
		);
		const url = decode(value);

		expect(getSystemCredentials).toHaveBeenCalledWith('eu-central-1');
		expect(url.searchParams.get('X-Amz-Credential')).toBe(
			'ASIASYSTEM/20261114/eu-central-1/kafka-cluster/aws4_request',
		);
		expect(url.searchParams.get('X-Amz-Security-Token')).toBe('system-session');
	});

	it('ignores the access key fields when system credentials are selected', async () => {
		getSystemCredentials.mockResolvedValue({
			accessKeyId: 'ASIASYSTEM',
			secretAccessKey: 'system-secret',
			source: 'environment',
		});

		const { value } = await generateMskIamToken(
			creds({ awsUseSystemCredentials: true }),
			SIGNED_AT,
		);

		expect(decode(value).searchParams.get('X-Amz-Credential')).toMatch(/^ASIASYSTEM\//);
	});

	it('throws when no AWS system credentials are available', async () => {
		getSystemCredentials.mockResolvedValue(null);

		await expect(
			generateMskIamToken(creds({ awsUseSystemCredentials: true }), SIGNED_AT),
		).rejects.toThrow(UserError);
	});

	it('passes on the error when access to AWS system credentials is turned off', async () => {
		const disabled = new UserError(
			'Access to AWS system credentials disabled, contact your administrator.',
		);
		getSystemCredentials.mockRejectedValue(disabled);

		await expect(
			generateMskIamToken(creds({ awsUseSystemCredentials: true }), SIGNED_AT),
		).rejects.toBe(disabled);
	});

	it.each([
		['access key ID', { awsAccessKeyId: '' }],
		['secret access key', { awsSecretAccessKey: ' ' }],
	])('throws without an %s', async (_, overrides) => {
		await expect(generateMskIamToken(creds(overrides), SIGNED_AT)).rejects.toThrow(UserError);
		expect(getSystemCredentials).not.toHaveBeenCalled();
	});

	it('throws without an AWS Region', async () => {
		await expect(generateMskIamToken(creds({ awsRegion: undefined }), SIGNED_AT)).rejects.toThrow(
			'AWS MSK IAM authentication needs an AWS Region',
		);
	});
});
