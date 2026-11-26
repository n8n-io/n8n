import { describe, expect, test } from 'vitest';

import {
	buildN8nS3Env,
	formatBucketName,
	isLocalStackHealthy,
	LocalStackHelper,
	validateBucketName,
} from '../services/localstack';

describe('isLocalStackHealthy', () => {
	test.each([
		{
			scenario: 'both services available',
			body: JSON.stringify({ services: { secretsmanager: 'available', s3: 'available' } }),
		},
		{
			scenario: 'services already running on a reused container',
			body: JSON.stringify({ services: { secretsmanager: 'running', s3: 'available' } }),
		},
		{
			scenario: 'both services running',
			body: JSON.stringify({ services: { secretsmanager: 'running', s3: 'running' } }),
		},
	])('returns true when $scenario', ({ body }) => {
		expect(isLocalStackHealthy(body)).toBe(true);
	});

	test.each([
		{
			scenario: 's3 is still starting',
			body: JSON.stringify({ services: { secretsmanager: 'available', s3: 'starting' } }),
		},
		{
			scenario: 's3 is missing',
			body: JSON.stringify({ services: { secretsmanager: 'available' } }),
		},
		{
			scenario: 'secretsmanager is missing',
			body: JSON.stringify({ services: { s3: 'available' } }),
		},
		{ scenario: 'services key is absent', body: JSON.stringify({}) },
		{ scenario: 'payload is null', body: 'null' },
		{ scenario: 'payload is invalid JSON', body: 'not-json' },
	])('returns false when $scenario', ({ body }) => {
		expect(isLocalStackHealthy(body)).toBe(false);
	});
});

describe('bucket name validation and generation', () => {
	test.each(['abc', 'n8n-test-1', 'bucket.with-dots.1', 'a'.repeat(63)])(
		'accepts valid bucket name: %s',
		(name) => {
			expect(() => validateBucketName(name)).not.toThrow();
		},
	);

	test.each([
		'',
		'ab',
		'a'.repeat(64),
		'UpperCase',
		'under_score',
		'-leading-hyphen',
		'trailing-hyphen-',
		'.leading-dot',
		'trailing-dot.',
		'double..dot',
		'192.168.1.1',
	])('rejects invalid bucket name: %s', (name) => {
		expect(() => validateBucketName(name)).toThrow(/Invalid S3 bucket name/);
	});

	test('normalizes arbitrary prefixes into valid isolated bucket names', () => {
		expect(formatBucketName('My_Test Stack!', 'AB12')).toBe('my-test-stack-ab12');
		expect(formatBucketName('---!!!---', 'abc123')).toBe('bucket-abc123');
	});

	test('truncates long prefixes to fit the 63-character S3 limit without trailing hyphens', () => {
		const bucket = formatBucketName(`${'a'.repeat(53)}-tail`, '12345678');

		expect(bucket.length).toBeLessThanOrEqual(63);
		expect(bucket).toBe(`${'a'.repeat(53)}-12345678`);
	});

	test('rejects suffixes without alphanumeric characters', () => {
		expect(() => formatBucketName('n8n-test', '---')).toThrow(/suffix/i);
	});
});

describe('buildN8nS3Env', () => {
	const config = {
		host: 'localstack:4566',
		protocol: 'http' as const,
		region: 'us-east-1',
		credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
	};

	test('omits bucket name when not provided', () => {
		expect(buildN8nS3Env(config)).toEqual({
			N8N_EXTERNAL_STORAGE_S3_HOST: 'localstack:4566',
			N8N_EXTERNAL_STORAGE_S3_PROTOCOL: 'http',
			N8N_EXTERNAL_STORAGE_S3_BUCKET_REGION: 'us-east-1',
			N8N_EXTERNAL_STORAGE_S3_ACCESS_KEY: 'test',
			N8N_EXTERNAL_STORAGE_S3_ACCESS_SECRET: 'test',
			N8N_EXTERNAL_STORAGE_S3_FORCE_PATH_STYLE: 'true',
		});
	});

	test('includes bucket name when provided and rejects invalid bucket names', () => {
		expect(buildN8nS3Env(config, 'n8n-binary-test')).toMatchObject({
			N8N_EXTERNAL_STORAGE_S3_BUCKET_NAME: 'n8n-binary-test',
		});
		expect(() => buildN8nS3Env(config, 'Invalid_Bucket')).toThrow(/Invalid S3 bucket name/);
	});
});

describe('LocalStackHelper', () => {
	test('builds container-side and external n8n S3 environment variables without protocol in host', () => {
		const helper = new LocalStackHelper({
			endpoint: 'http://127.0.0.1:32768',
			internalEndpoint: 'http://localstack:4566',
			host: '127.0.0.1:32768',
			internalHost: 'localstack:4566',
			protocol: 'http',
			region: 'us-east-1',
			credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
		});

		expect(helper.getN8nS3Env('n8n-binary-test')).toEqual({
			N8N_EXTERNAL_STORAGE_S3_HOST: 'localstack:4566',
			N8N_EXTERNAL_STORAGE_S3_PROTOCOL: 'http',
			N8N_EXTERNAL_STORAGE_S3_BUCKET_NAME: 'n8n-binary-test',
			N8N_EXTERNAL_STORAGE_S3_BUCKET_REGION: 'us-east-1',
			N8N_EXTERNAL_STORAGE_S3_ACCESS_KEY: 'test',
			N8N_EXTERNAL_STORAGE_S3_ACCESS_SECRET: 'test',
			N8N_EXTERNAL_STORAGE_S3_FORCE_PATH_STYLE: 'true',
		});

		expect(helper.getN8nS3Env('n8n-binary-test', { external: true })).toMatchObject({
			N8N_EXTERNAL_STORAGE_S3_HOST: '127.0.0.1:32768',
			N8N_EXTERNAL_STORAGE_S3_BUCKET_NAME: 'n8n-binary-test',
		});
		expect(helper.s3Config.endpoint).toBe('http://127.0.0.1:32768');
		expect(helper.internalS3Config.endpoint).toBe('http://localstack:4566');
	});

	test('resolves string endpoints and rejects invalid bucket names in getN8nS3Env', () => {
		const helper = new LocalStackHelper('https://127.0.0.1:4566/');

		expect(helper.endpoint).toBe('https://127.0.0.1:4566');
		expect(helper.protocol).toBe('https');
		expect(helper.s3Config.host).toBe('127.0.0.1:4566');
		expect(helper.internalS3Config.protocol).toBe('http');
		expect(() => helper.getN8nS3Env('Invalid_Bucket')).toThrow(/Invalid S3 bucket name/);
	});
});
