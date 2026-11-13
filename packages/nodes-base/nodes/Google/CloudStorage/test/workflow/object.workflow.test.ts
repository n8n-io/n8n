import { mock } from 'vitest-mock-extended';
import { Container } from '@n8n/di';
import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { BinaryDataService, type BinaryDataConfig } from 'n8n-core';
import nock from 'nock';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { googleApiCredentials } from '../../../BigQuery/test/v2/node/credentials.fixture';

describe('Google Cloud Storage > Object > Workflows', () => {
	const storagePath = mkdtempSync(path.join(tmpdir(), 'n8n-gcs-'));
	const mockApi = nock('https://storage.googleapis.com');
	const testHarness = new NodeTestHarness();
	let binaryDataService: BinaryDataService;

	beforeAll(async () => {
		binaryDataService = new BinaryDataService(
			mock<BinaryDataConfig>({ mode: 'filesystem', localStoragePath: storagePath }),
			mock(),
			mock(),
		);
		await binaryDataService.init();

		nock('https://oauth2.googleapis.com').persist().post('/token').reply(200, {
			access_token: 'token',
		});

		for (const sessionId of ['session-oauth2', 'session-service-account']) {
			mockApi
				.post('/upload/storage/v1/b/n8n-test-bucket/o/')
				.query({ name: 'reports/2026/summary.txt', uploadType: 'resumable', projection: 'full' })
				.reply(200, {}, { location: `https://storage.googleapis.com/upload/${sessionId}` })
				.put(`/upload/${sessionId}`)
				.reply(200, {})
				.get('/storage/v1/b/n8n-test-bucket/o/reports%2F2026%2Fsummary.txt')
				.query({ projection: 'full' })
				.reply(200, {
					kind: 'storage#object',
					bucket: 'n8n-test-bucket',
					name: 'reports/2026/summary.txt',
				});
		}
	});

	beforeEach(() => Container.set(BinaryDataService, binaryDataService));

	afterAll(() => {
		rmSync(storagePath, { recursive: true, force: true });
	});

	testHarness.setupTests({
		credentials: {
			googleApi: googleApiCredentials,
			googleCloudStorageOAuth2Api: { oauthTokenData: { access_token: 'access-token' } },
		},
		customAssertions: () => expect(mockApi.isDone()).toBe(true),
	});
});
