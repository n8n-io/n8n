import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

function makeDatabase(id: string, name: string) {
	return {
		object: 'database',
		id,
		cover: null,
		icon: null,
		created_time: '2024-01-01T00:00:00.000Z',
		created_by: { object: 'user', id: '88f72c1a-07ed-4bae-9fa0-231365d813d9' },
		last_edited_by: { object: 'user', id: '88f72c1a-07ed-4bae-9fa0-231365d813d9' },
		last_edited_time: '2024-01-01T00:00:00.000Z',
		title: [
			{
				type: 'text',
				text: { content: name, link: null },
				annotations: {
					bold: false,
					italic: false,
					strikethrough: false,
					underline: false,
					code: false,
					color: 'default',
				},
				plain_text: name,
				href: null,
			},
		],
		description: [],
		is_inline: false,
		properties: {
			Name: { id: 'title', name: 'Name', type: 'title', title: {} },
		},
		parent: { type: 'page_id', page_id: 'cc3d2b3c-f31a-4773-ab39-17a60c54567a' },
		url: `https://www.notion.so/${id.replace(/-/g, '')}`,
		public_url: null,
		archived: false,
		in_trash: false,
	};
}

const PAGE_1_RESPONSE = {
	results: [
		makeDatabase('d0000001-0000-0000-0000-000000000001', 'Database A'),
		makeDatabase('d0000002-0000-0000-0000-000000000002', 'Database B'),
	],
	has_more: true,
	next_cursor: 'cursor-page2',
};

const PAGE_2_RESPONSE = {
	results: [
		makeDatabase('d0000003-0000-0000-0000-000000000003', 'Database C'),
		makeDatabase('d0000004-0000-0000-0000-000000000004', 'Database D'),
	],
	has_more: false,
};

describe('Test NotionV2, database => getAll with pagination', () => {
	nock('https://api.notion.com')
		.post('/v1/search')
		.reply(200, PAGE_1_RESPONSE)
		.post('/v1/search')
		.reply(200, PAGE_2_RESPONSE);

	new NodeTestHarness().setupTests({
		workflowFiles: ['getAllPaginated.workflow.json'],
	});
});
