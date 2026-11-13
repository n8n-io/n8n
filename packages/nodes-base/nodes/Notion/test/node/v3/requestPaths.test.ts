import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test NotionV3, request paths', () => {
	beforeAll(() => {
		const mock = nock('https://api.notion.com/v1');
		mock
			.patch('/blocks/2f4b7c1e9a3d4e8f8b6a1c2d3e4f5a71/children')
			.reply(200, { object: 'list', id: '2f4b7c1e9a3d4e8f8b6a1c2d3e4f5a71' });
		mock
			.get('/pages/2f4b7c1e9a3d4e8f8b6a1c2d3e4f5a72/markdown')
			.reply(200, { object: 'page_markdown', markdown: 'Block notes' });
		mock
			.get('/blocks/2f4b7c1e9a3d4e8f8b6a1c2d3e4f5a73/children')
			.query({ page_size: 2 })
			.reply(200, {
				results: [
					{
						object: 'block',
						id: '7a1e2b3c-4d5e-4f60-8172-839405a6b7d1',
						type: 'paragraph',
						has_children: true,
					},
				],
				has_more: false,
			});
		mock.get('/blocks/7a1e2b3c-4d5e-4f60-8172-839405a6b7d1/children').reply(200, {
			results: [
				{
					object: 'block',
					id: '7a1e2b3c-4d5e-4f60-8172-839405a6b7d2',
					type: 'paragraph',
					has_children: false,
				},
			],
			has_more: false,
		});
		mock
			.get('/databases/138fb9cb-4cf0-804c-8663-d8ecdd5e6911')
			.reply(200, { object: 'database', id: '138fb9cb-4cf0-804c-8663-d8ecdd5e6911' });
		mock
			.get('/data_sources/248fb9cb-4cf0-804c-8663-d8ecdd5e6912')
			.reply(200, { object: 'data_source', id: '248fb9cb-4cf0-804c-8663-d8ecdd5e6912' });
		mock.get('/data_sources/248fb9cb-4cf0-804c-8663-d8ecdd5e6913').reply(200, {
			object: 'data_source',
			id: '248fb9cb-4cf0-804c-8663-d8ecdd5e6913',
			properties: { Name: { id: 'title', type: 'title' } },
		});
		mock.post('/pages').reply(200, { object: 'page', id: '15bfb9cb-4cf0-81c7-aab4-c5855b8cb611' });
		mock
			.get('/pages/15bfb9cb4cf081c7aab4c5855b8cb612')
			.reply(200, { object: 'page', id: '15bfb9cb-4cf0-81c7-aab4-c5855b8cb612' });
		mock.post('/data_sources/248fb9cb-4cf0-804c-8663-d8ecdd5e6914/query').reply(200, {
			results: [{ object: 'page', id: '15bfb9cb-4cf0-81c7-aab4-c5855b8cb613' }],
			has_more: false,
		});
		mock
			.patch('/pages/15bfb9cb4cf081c7aab4c5855b8cb614')
			.reply(200, { object: 'page', id: '15bfb9cb-4cf0-81c7-aab4-c5855b8cb614' });
		mock
			.patch('/pages/15bfb9cb4cf081c7aab4c5855b8cb615', { in_trash: true })
			.reply(200, { object: 'page', id: '15bfb9cb-4cf0-81c7-aab4-c5855b8cb615' });
		mock
			.get('/pages/15bfb9cb4cf081c7aab4c5855b8cb616/markdown')
			.reply(200, { object: 'page_markdown', markdown: 'Page notes' });
		mock
			.patch('/pages/15bfb9cb4cf081c7aab4c5855b8cb617/markdown')
			.reply(200, { object: 'page_markdown', markdown: '# Weekly sync' });
		mock
			.get('/users/34a945c6-de97-4efc-90d6-6d7cc14a6584')
			.reply(200, { object: 'user', id: '34a945c6-de97-4efc-90d6-6d7cc14a6584' });
	});

	afterAll(() => {
		expect(nock.isDone()).toBe(true);
	});

	new NodeTestHarness().setupTests({
		workflowFiles: ['requestPaths.workflow.json'],
		credentials: { notionApi: { apiKey: 'secret_test' } },
	});
});
