import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const API_RESPONSE = {
	object: 'list',
	results: [
		{
			object: 'data_source',
			id: '248fb9cb-5cf0-904c-9774-e9fddecce803',
			name: 'Customer Database',
			title: [
				{
					type: 'text',
					text: {
						content: 'Customer Database',
					},
					plain_text: 'Customer Database',
				},
			],
			created_time: '2024-12-13T04:00:00.000Z',
			last_edited_time: '2024-12-13T04:30:00.000Z',
			url: 'https://www.notion.so/248fb9cb5cf0904c9774e9fddecce803',
		},
		{
			object: 'data_source',
			id: '358gc0cb-6dg1-a15d-aa96-f0aeedffe915',
			name: 'Products Database',
			title: [
				{
					type: 'text',
					text: {
						content: 'Products Database',
					},
					plain_text: 'Products Database',
				},
			],
			created_time: '2024-12-13T05:00:00.000Z',
			last_edited_time: '2024-12-13T05:30:00.000Z',
			url: 'https://www.notion.so/358gc0cb6dg1a15daa96f0aeedffe915',
		},
	],
	has_more: false,
	next_cursor: null,
	type: 'data_source',
	data_source: {},
	request_id: '3638924f-fcc0-6h0f-bdf5-e77hg74608d7',
};

describe('Test NotionV3, database => search', () => {
	nock('https://api.notion.com')
		// Search for data sources (not databases) in v3
		.post('/v1/search', {
			query: 'database',
			filter: {
				property: 'object',
				value: 'data_source',
			},
		})
		.reply(200, API_RESPONSE);

	new NodeTestHarness().setupTests({
		workflowFiles: ['search.workflow.json'],
	});
});
