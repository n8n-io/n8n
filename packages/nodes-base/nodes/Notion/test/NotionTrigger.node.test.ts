import nock from 'nock';

import type { IDataObject } from 'n8n-workflow';

import { testPollingTriggerNode } from '@test/nodes/TriggerHelpers';

import { NotionTrigger } from '../NotionTrigger.node';

describe('NotionTrigger', () => {
	const baseUrl = 'https://api.notion.com';

	beforeAll(() => {
		nock.disableNetConnect();
	});

	afterAll(() => {
		nock.restore();
	});

	afterEach(() => {
		nock.cleanAll();
	});

	describe('lastTimeChecked serialization', () => {
		it('should store lastTimeChecked as an ISO string, not a moment object', async () => {
			const staticData: IDataObject = {};

			nock(baseUrl)
				.post('/v1/databases/test-db-id/query')
				.reply(200, { results: [], has_more: false, next_cursor: null });

			await testPollingTriggerNode(NotionTrigger, {
				node: {
					parameters: {
						event: 'pageAddedToDatabase',
						databaseId: 'test-db-id',
						simple: true,
					},
				},
				workflowStaticData: staticData,
			});

			expect(staticData.lastTimeChecked).toBeDefined();
			expect(typeof staticData.lastTimeChecked).toBe('string');
			// Verify it's a valid ISO 8601 string
			expect(new Date(staticData.lastTimeChecked as string).toISOString()).toBe(
				staticData.lastTimeChecked,
			);
		});

		it('should correctly read back a previously stored ISO string', async () => {
			const previousTime = '2024-06-15T10:30:00.000Z';
			const staticData: IDataObject = { lastTimeChecked: previousTime };

			nock(baseUrl)
				.post('/v1/databases/test-db-id/query')
				.reply(200, { results: [], has_more: false, next_cursor: null });

			await testPollingTriggerNode(NotionTrigger, {
				node: {
					parameters: {
						event: 'pagedUpdatedInDatabase',
						databaseId: 'test-db-id',
						simple: true,
					},
				},
				workflowStaticData: staticData,
			});

			// After poll, lastTimeChecked should be updated and still a string
			expect(typeof staticData.lastTimeChecked).toBe('string');
			expect(staticData.lastTimeChecked).not.toBe(previousTime);
		});
	});
});
