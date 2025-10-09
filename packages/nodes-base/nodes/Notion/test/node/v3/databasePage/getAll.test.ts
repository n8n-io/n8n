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
				type: 'data_source_id',
				data_source_id: '248fb9cb-5cf0-904c-9774-e9fddecce803',
			},
			properties: {
				Name: {
					id: 'title',
					type: 'title',
					title: [
						{
							type: 'text',
							text: {
								content: 'Test Page 1',
							},
							plain_text: 'Test Page 1',
						},
					],
				},
			},
		},
		{
			object: 'page',
			id: '25cfb9cb-5df0-92d8-bbc5-d6966c9dc7d4',
			created_time: '2024-12-13T05:00:00.000Z',
			last_edited_time: '2024-12-13T05:00:00.000Z',
			parent: {
				type: 'data_source_id',
				data_source_id: '248fb9cb-5cf0-904c-9774-e9fddecce803',
			},
			properties: {
				Name: {
					id: 'title',
					type: 'title',
					title: [
						{
							type: 'text',
							text: {
								content: 'Test Page 2',
							},
							plain_text: 'Test Page 2',
						},
					],
				},
			},
		},
	],
	has_more: false,
	next_cursor: null,
	type: 'page_or_database',
	page_or_database: {},
	request_id: '2527813e-ebb9-5g9e-ace4-d66gf63597c6',
};

describe('Test NotionV3, databasePage => getAll', () => {
	const databaseId = '138fb9cb-4cf0-804c-8663-d8ecdd5e692f';
	const dataSourceId = '248fb9cb-5cf0-904c-9774-e9fddecce803';

	nock('https://api.notion.com')
		// Get database to retrieve data source ID
		.get(`/v1/databases/${databaseId}`)
		.reply(200, {
			object: 'database',
			id: databaseId,
			data_sources: [
				{
					id: dataSourceId,
					name: 'Main Data Source',
					type: 'data_source',
				},
			],
		})
		// Query the data source (not the database)
		.post(`/v1/data_sources/${dataSourceId}/query`, {
			page_size: 2,
		})
		.reply(200, API_RESPONSE);

	const harness = new NodeTestHarness({
		node: {
			name: 'Notion',
			type: 'notion',
			typeVersion: 3,
		},
		workflow: require('./getAll.workflow.json'),
	});

	it('should query database pages using data_source_id in v3', async () => {
		const result = await harness.executeNode();
		expect(result).toHaveLength(1);
		expect(result[0].json).toHaveLength(2);
		expect(result[0].json).toEqual(API_RESPONSE.results);
	});
});
