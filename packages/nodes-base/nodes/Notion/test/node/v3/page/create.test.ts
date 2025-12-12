import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const API_RESPONSE = {
	object: 'page',
	id: '35dfc0cb-5ef1-a26e-bbd6-e7a77dadf826',
	created_time: '2024-12-13T06:00:00.000Z',
	last_edited_time: '2024-12-13T06:00:00.000Z',
	created_by: {
		object: 'user',
		id: 'f215e49c-4677-40c0-9adc-87440d341324',
	},
	last_edited_by: {
		object: 'user',
		id: 'f215e49c-4677-40c0-9adc-87440d341324',
	},
	cover: null,
	icon: null,
	parent: {
		type: 'page_id',
		page_id: '45efd1cb-6ff2-b37f-cce7-f8b88ebef937',
	},
	archived: false,
	in_trash: false,
	properties: {
		title: {
			id: 'title',
			type: 'title',
			title: [
				{
					type: 'text',
					text: {
						content: 'New Subpage',
						link: null,
					},
					plain_text: 'New Subpage',
				},
			],
		},
	},
	url: 'https://www.notion.so/new-subpage-35dfc0cb5ef1a26ebbd6e7a77dadf826',
	public_url: null,
};

describe('Test NotionV3, page => create', () => {
	nock('https://api.notion.com')
		.post('/v1/pages', {
			parent: { page_id: '45efd1cb-6ff2-b37f-cce7-f8b88ebef937' },
			properties: {
				title: {
					title: [
						{
							text: {
								content: 'New Subpage',
							},
						},
					],
				},
			},
			children: [],
		})
		.reply(200, API_RESPONSE);

	new NodeTestHarness().setupTests({
		workflowFiles: ['create.workflow.json'],
	});
});
