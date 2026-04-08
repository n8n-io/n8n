import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const API_RESPONSE = {
	object: 'page',
	id: '15bfb9cb-4cf0-812b-b4bc-c85cd00727f8',
	created_time: '2024-12-13T06:01:00.000Z',
	last_edited_time: '2024-12-13T06:01:00.000Z',
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
		emoji: '😊',
	},
	parent: {
		type: 'page_id',
		page_id: '15bfb9cb-4cf0-81c7-aab4-c5855b8cb6c3',
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
						content: 'Child page',
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
					plain_text: 'Child page',
					href: null,
				},
			],
		},
	},
	url: 'https://www.notion.so/Child-page-15bfb9cb4cf0812bb4bcc85cd00727f8',
	public_url: null,
	request_id: 'df28ec00-4361-46af-a3b6-add18c8d1295',
};

describe('Test NotionV2, page => create', () => {
	nock('https://api.notion.com')
		.post('/v1/pages', {
			parent: { page_id: '15bfb9cb4cf081c7aab4c5855b8cb6c3' },
			properties: { title: [{ text: { content: 'Child page' } }] },
			children: [
				{
					object: 'block',
					type: 'heading_1',
					heading_1: { text: [{ type: 'text', text: { content: 'Title' }, annotations: {} }] },
				},
				{
					object: 'block',
					type: 'paragraph',
					paragraph: { text: [{ text: { content: 'text' } }] },
				},
			],
			icon: { emoji: '😊' },
		})
		.reply(200, API_RESPONSE);

	new NodeTestHarness().setupTests({
		workflowFiles: ['create.workflow.json'],
	});
});
