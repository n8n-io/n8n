import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const API_RESPONSE = {
	object: 'list',
	results: [
		{
			object: 'page',
			id: '15bfb9cb-4cf0-81c7-aab4-c5855b8cb6c3',
			created_time: '2024-12-13T04:45:00.000Z',
			last_edited_time: '2024-12-13T04:45:00.000Z',
			parent: {
				type: 'workspace',
				workspace: true,
			},
			properties: {
				title: {
					id: 'title',
					type: 'title',
					title: [
						{
							type: 'text',
							text: {
								content: 'Search Result 1',
							},
							plain_text: 'Search Result 1',
						},
					],
				},
			},
			url: 'https://www.notion.so/search-result-1-15bfb9cb4cf081c7aab4c5855b8cb6c3',
		},
		{
			object: 'page',
			id: '25cfb9cb-5df0-92d8-bbc5-d6966c9dc7d4',
			created_time: '2024-12-13T05:00:00.000Z',
			last_edited_time: '2024-12-13T05:00:00.000Z',
			parent: {
				type: 'workspace',
				workspace: true,
			},
			properties: {
				title: {
					id: 'title',
					type: 'title',
					title: [
						{
							type: 'text',
							text: {
								content: 'Search Result 2',
							},
							plain_text: 'Search Result 2',
						},
					],
				},
			},
			url: 'https://www.notion.so/search-result-2-25cfb9cb5df092d8bbc5d6966c9dc7d4',
		},
	],
	has_more: false,
	next_cursor: null,
	type: 'page',
	page: {},
	request_id: '5840a36h-hee2-8j2h-dfh7-g99ji96810f9',
};

describe('Test NotionV3, page => search', () => {
	nock('https://api.notion.com')
		.post('/v1/search', {
			query: 'search',
			page_size: 2,
		})
		.reply(200, API_RESPONSE);

	new NodeTestHarness().setupTests({
		workflowFiles: ['search.workflow.json'],
	});
});
