import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test NotionV1, request paths', () => {
	beforeAll(() => {
		const mock = nock('https://api.notion.com/v1');
		mock
			.patch('/blocks/2f4b7c1e9a3d4e8f8b6a1c2d3e4f5a61/children')
			.reply(200, { object: 'block', id: '2f4b7c1e9a3d4e8f8b6a1c2d3e4f5a61' });
		mock
			.get('/blocks/2f4b7c1e9a3d4e8f8b6a1c2d3e4f5a62/children')
			.query({ page_size: 2 })
			.reply(200, {
				results: [{ object: 'block', id: '7a1e2b3c-4d5e-4f60-8172-839405a6b7c1' }],
				has_more: false,
			});
		mock
			.get('/databases/138fb9cb-4cf0-804c-8663-d8ecdd5e6901')
			.reply(200, { object: 'database', id: '138fb9cb-4cf0-804c-8663-d8ecdd5e6901' });
		mock.post('/databases/138fb9cb-4cf0-804c-8663-d8ecdd5e6902/query').reply(200, {
			results: [{ object: 'page', id: '15bfb9cb-4cf0-81c7-aab4-c5855b8cb601' }],
			has_more: false,
		});
		mock
			.patch('/pages/15bfb9cb4cf081c7aab4c5855b8cb602')
			.reply(200, { object: 'page', id: '15bfb9cb-4cf0-81c7-aab4-c5855b8cb602' });
		mock
			.get('/pages/15bfb9cb4cf081c7aab4c5855b8cb603')
			.reply(200, { object: 'page', id: '15bfb9cb-4cf0-81c7-aab4-c5855b8cb603' });
		mock
			.get('/users/34a945c6-de97-4efc-90d6-6d7cc14a6583')
			.reply(200, { object: 'user', id: '34a945c6-de97-4efc-90d6-6d7cc14a6583' });
	});

	afterAll(() => {
		expect(nock.isDone()).toBe(true);
	});

	new NodeTestHarness().setupTests({
		workflowFiles: ['requestPaths.workflow.json'],
		credentials: { notionApi: { apiKey: 'secret_test' } },
	});
});
