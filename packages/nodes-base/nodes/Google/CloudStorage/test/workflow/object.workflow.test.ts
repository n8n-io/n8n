import { mock } from 'jest-mock-extended';
import { Container } from '@n8n/di';
import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { BinaryDataService, type BinaryDataConfig } from 'n8n-core';
import nock from 'nock';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

describe('Google Cloud Storage > Object > Workflows', () => {
	const storagePath = mkdtempSync(path.join(tmpdir(), 'n8n-gcs-'));
	const mockApi = nock('https://storage.googleapis.com');

	beforeAll(async () => {
		const binaryDataService = new BinaryDataService(
			mock<BinaryDataConfig>({
				mode: 'filesystem',
				availableModes: ['filesystem'],
				localStoragePath: storagePath,
			}),
			mock(),
			mock(),
		);
		await binaryDataService.init();
		Container.set(BinaryDataService, binaryDataService);

		// The node uploads the object in one multipart request. The object name goes in the query.
		mockApi
			.post('/upload/storage/v1/b/n8n-test-bucket/o/')
			.query({ name: 'reports/2026/summary.txt', uploadType: 'multipart', projection: 'full' })
			.reply(200, {
				kind: 'storage#object',
				bucket: 'n8n-test-bucket',
				name: 'reports/2026/summary.txt',
			});
	});

	afterAll(() => {
		rmSync(storagePath, { recursive: true, force: true });
	});

	new NodeTestHarness().setupTests({
		credentials: {
			googleCloudStorageOAuth2Api: { oauthTokenData: { access_token: 'access-token' } },
		},
		customAssertions: () => expect(mockApi.isDone()).toBe(true),
	});
});
