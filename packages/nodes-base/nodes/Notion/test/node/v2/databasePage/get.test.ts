import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const API_RESPONSE = {
	object: 'page',
	id: '15bfb9cb-4cf0-81c7-aab4-c5855b8cb6c3',
	created_time: '2024-12-13T04:45:00.000Z',
	last_edited_time: '2024-12-13T04:45:00.000Z',
	created_by: {
		object: 'user',
		id: 'f215e49c-4677-40c0-9adc-87440d341324',
	},
	last_edited_by: {
		object: 'user',
		id: 'f215e49c-4677-40c0-9adc-87440d341324',
	},
	cover: null,
	icon: {
		type: 'emoji',
		emoji: '😗',
	},
	parent: {
		type: 'database_id',
		database_id: '138fb9cb-4cf0-804c-8663-d8ecdd5e692f',
	},
	archived: false,
	in_trash: false,
	properties: {
		Tags: {
			id: '%40~Tp',
			type: 'multi_select',
			multi_select: [],
		},
		Name: {
			id: 'title',
			type: 'title',
			title: [
				{
					type: 'text',
					text: {
						content: 'new name 1',
						link: null,
					},
					annotations: {
						bold: false,
						italic: false,
						strikethrough: false,
						underline: false,
						code: false,
						color: 'default',
					},
					plain_text: 'new name 1',
					href: null,
				},
			],
		},
	},
	url: 'https://www.notion.so/new-name-1-15bfb9cb4cf081c7aab4c5855b8cb6c3',
	public_url: null,
	request_id: 'c01d3a3e-d9c3-4e48-8d73-077a8503c3ba',
};

describe('Test NotionV2, databasePage => get', () => {
	nock('https://api.notion.com')
		.get('/v1/pages/15bfb9cb4cf081c7aab4c5855b8cb6c3')
		.reply(200, API_RESPONSE);

	new NodeTestHarness().setupTests({
		workflowFiles: ['get.workflow.json'],
	});
});
