import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test NotionTrigger, query request paths', () => {
	beforeAll(() => {
		const mock = nock('https://api.notion.com/v1');
		mock
			.post('/databases/138fb9cb-4cf0-804c-8663-d8ecdd5e6921/query')
			.matchHeader('Notion-Version', '2022-02-22')
			.reply(200, {
				results: [{ object: 'page', id: '15bfb9cb-4cf0-81c7-aab4-c5855b8cb621' }],
				has_more: false,
			});
	});

	afterAll(() => {
		expect(nock.isDone()).toBe(true);
	});

	new NodeTestHarness().setupTests({
		workflowFiles: ['databaseQuery.workflow.json'],
		credentials: { notionApi: { apiKey: 'secret_test' } },
	});
});
