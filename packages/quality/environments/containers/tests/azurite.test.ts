import { describe, expect, test } from 'vitest';

import {
	AzuriteHelper,
	buildAzuriteConnectionString,
	buildAzuriteEndpoint,
	buildN8nAzureBlobEnv,
	formatBlobContainerName,
	isAzureNotFound,
	validateBlobContainerName,
} from '../services/azurite';

describe('container name validation and generation', () => {
	test.each(['abc', 'n8n-test-1', 'a-b', 'a'.repeat(63)])(
		'accepts valid Azure Blob container name: %s',
		(name) => {
			expect(() => validateBlobContainerName(name)).not.toThrow();
		},
	);

	test.each([
		'',
		'ab',
		'a'.repeat(64),
		'UpperCase',
		'under_score',
		'with.dot',
		'-leading-hyphen',
		'trailing-hyphen-',
		'double--hyphen',
		'$web',
	])('rejects invalid Azure Blob container name: %s', (name) => {
		expect(() => validateBlobContainerName(name)).toThrow(/Invalid Azure Blob container name/);
	});

	test('normalizes arbitrary prefixes and collapses repeated separators', () => {
		expect(formatBlobContainerName('My__Test  Stack!', 'AB12')).toBe('my-test-stack-ab12');
		expect(formatBlobContainerName('a--b..c', '1234')).toBe('a-b-c-1234');
		expect(formatBlobContainerName('---!!!---', 'abc123')).toBe('container-abc123');
	});

	test('truncates long prefixes to fit the 63-character Azure limit without trailing hyphens', () => {
		const containerName = formatBlobContainerName(`${'a'.repeat(53)}-tail`, '12345678');

		expect(containerName.length).toBeLessThanOrEqual(63);
		expect(containerName).toBe(`${'a'.repeat(53)}-12345678`);
	});

	test('rejects suffixes without alphanumeric characters', () => {
		expect(() => formatBlobContainerName('n8n-test', '---')).toThrow(/suffix/i);
	});
});

describe('isAzureNotFound', () => {
	test.each([
		{ scenario: 'HTTP 404 statusCode', error: { statusCode: 404 } },
		{ scenario: 'ContainerNotFound code', error: { code: 'ContainerNotFound' } },
		{ scenario: 'BlobNotFound code', error: { code: 'BlobNotFound' } },
		{ scenario: 'ResourceNotFound code', error: { code: 'ResourceNotFound' } },
	])('returns true for $scenario', ({ error }) => {
		expect(isAzureNotFound(error)).toBe(true);
	});

	test.each([
		{ scenario: 'HTTP 403 statusCode', error: { statusCode: 403, code: 'AuthorizationFailure' } },
		{ scenario: 'plain Error', error: new Error('network error') },
		{ scenario: 'null', error: null },
		{ scenario: 'string', error: 'ContainerNotFound' },
	])('returns false for $scenario', ({ error }) => {
		expect(isAzureNotFound(error)).toBe(false);
	});
});

describe('endpoint, connection string, and env builders', () => {
	test('builds normalized Azurite endpoints', () => {
		expect(buildAzuriteEndpoint('azurite:10000')).toBe('http://azurite:10000/devstoreaccount1');
		expect(buildAzuriteEndpoint('http://127.0.0.1:32768/', 'customacct', 'https')).toBe(
			'https://127.0.0.1:32768/customacct',
		);
		expect(() => buildAzuriteEndpoint('   /')).toThrow(/Azurite host must not be empty/);
	});

	test('builds Azure Storage connection strings without trailing slash on BlobEndpoint', () => {
		expect(
			buildAzuriteConnectionString({
				protocol: 'http',
				accountName: 'devstoreaccount1',
				accountKey: 'test-key==',
				endpoint: 'http://azurite:10000/devstoreaccount1/',
			}),
		).toBe(
			'DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=test-key==;BlobEndpoint=http://azurite:10000/devstoreaccount1;',
		);
	});

	test('builds n8n Azure Blob env vars with optional validated container name', () => {
		const config = {
			endpoint: 'http://azurite:10000/devstoreaccount1',
			connectionString:
				'DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=test-key==;BlobEndpoint=http://azurite:10000/devstoreaccount1;',
			accountName: 'devstoreaccount1',
			accountKey: 'test-key==',
		};

		expect(buildN8nAzureBlobEnv(config)).toEqual({
			N8N_EXTERNAL_STORAGE_AZURE_CONNECTION_STRING: config.connectionString,
			N8N_EXTERNAL_STORAGE_AZURE_ACCOUNT_NAME: 'devstoreaccount1',
			N8N_EXTERNAL_STORAGE_AZURE_ACCOUNT_KEY: 'test-key==',
			N8N_EXTERNAL_STORAGE_AZURE_ENDPOINT: 'http://azurite:10000/devstoreaccount1',
		});

		expect(buildN8nAzureBlobEnv(config, 'n8n-binary-test')).toMatchObject({
			N8N_EXTERNAL_STORAGE_AZURE_CONTAINER_NAME: 'n8n-binary-test',
		});

		expect(() => buildN8nAzureBlobEnv(config, 'Invalid--Container')).toThrow(
			/Invalid Azure Blob container name/,
		);
	});
});

describe('AzuriteHelper', () => {
	test('builds container-side and external n8n Azure Blob environment variables', () => {
		const endpoint = 'http://127.0.0.1:32768/devstoreaccount1';
		const internalEndpoint = 'http://azurite:10000/devstoreaccount1';
		const connectionString = buildAzuriteConnectionString({
			protocol: 'http',
			accountName: 'devstoreaccount1',
			accountKey: 'test-key==',
			endpoint,
		});
		const internalConnectionString = buildAzuriteConnectionString({
			protocol: 'http',
			accountName: 'devstoreaccount1',
			accountKey: 'test-key==',
			endpoint: internalEndpoint,
		});

		const helper = new AzuriteHelper({
			endpoint,
			internalEndpoint,
			host: '127.0.0.1:32768',
			internalHost: 'azurite:10000',
			protocol: 'http',
			accountName: 'devstoreaccount1',
			accountKey: 'test-key==',
			connectionString,
			internalConnectionString,
		});

		expect(helper.getN8nAzureBlobEnv('n8n-binary-test')).toEqual({
			N8N_EXTERNAL_STORAGE_AZURE_CONNECTION_STRING: internalConnectionString,
			N8N_EXTERNAL_STORAGE_AZURE_ACCOUNT_NAME: 'devstoreaccount1',
			N8N_EXTERNAL_STORAGE_AZURE_ACCOUNT_KEY: 'test-key==',
			N8N_EXTERNAL_STORAGE_AZURE_ENDPOINT: internalEndpoint,
			N8N_EXTERNAL_STORAGE_AZURE_CONTAINER_NAME: 'n8n-binary-test',
		});

		expect(helper.getN8nAzureBlobEnv('n8n-binary-test', { external: true })).toMatchObject({
			N8N_EXTERNAL_STORAGE_AZURE_CONNECTION_STRING: connectionString,
			N8N_EXTERNAL_STORAGE_AZURE_ENDPOINT: endpoint,
			N8N_EXTERNAL_STORAGE_AZURE_CONTAINER_NAME: 'n8n-binary-test',
		});
		expect(helper.blobConfig.endpoint).toBe(endpoint);
		expect(helper.internalBlobConfig.endpoint).toBe(internalEndpoint);
	});

	test('resolves string endpoints with or without account path and validates container names', () => {
		const withPath = new AzuriteHelper('https://127.0.0.1:10000/customacct/');
		expect(withPath.endpoint).toBe('https://127.0.0.1:10000/customacct');
		expect(withPath.protocol).toBe('https');
		expect(withPath.accountName).toBe('customacct');
		expect(withPath.internalBlobConfig.endpoint).toBe('http://azurite:10000/customacct');

		const withoutPath = new AzuriteHelper('http://127.0.0.1:10000');
		expect(withoutPath.endpoint).toBe('http://127.0.0.1:10000/devstoreaccount1');
		expect(withoutPath.accountName).toBe('devstoreaccount1');
		expect(withoutPath.accountKey).toBe(Buffer.from('test').toString('base64'));
		expect(withoutPath.connectionString).toContain(`AccountKey=${withoutPath.accountKey};`);
		expect(() => withoutPath.getN8nAzureBlobEnv('Invalid_Container')).toThrow(
			/Invalid Azure Blob container name/,
		);
	});
});
