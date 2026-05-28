import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

function makePage(id: string, name: string) {
	return {
		object: 'page',
		id,
		created_time: '2024-01-01T00:00:00.000Z',
		last_edited_time: '2024-01-01T00:00:00.000Z',
		created_by: { object: 'user', id: '88f72c1a-07ed-4bae-9fa0-231365d813d9' },
		last_edited_by: { object: 'user', id: '88f72c1a-07ed-4bae-9fa0-231365d813d9' },
		cover: null,
		icon: null,
		parent: {
			type: 'database_id',
			database_id: '138fb9cb-4cf0-804c-8663-d8ecdd5e692f',
		},
		archived: false,
		in_trash: false,
		properties: {
			Tags: { id: '%40~Tp', type: 'multi_select', multi_select: [] },
			Name: {
				id: 'title',
				type: 'title',
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
			},
		},
		url: `https://www.notion.so/${name.replace(/ /g, '-')}-${id.replace(/-/g, '')}`,
		public_url: null,
	};
}

const PAGE_1_RESPONSE = {
	results: [
		makePage('p0000001-0000-0000-0000-000000000001', 'Page A'),
		makePage('p0000002-0000-0000-0000-000000000002', 'Page B'),
	],
	has_more: true,
	next_cursor: 'cursor-page2',
};

const PAGE_2_RESPONSE = {
	results: [
		makePage('p0000003-0000-0000-0000-000000000003', 'Page C'),
		makePage('p0000004-0000-0000-0000-000000000004', 'Page D'),
	],
	has_more: false,
};

describe('Test NotionV2, databasePage => getAll with pagination', () => {
	nock('https://api.notion.com')
		.post('/v1/databases/138fb9cb-4cf0-804c-8663-d8ecdd5e692f/query')
		.reply(200, PAGE_1_RESPONSE)
		.post('/v1/databases/138fb9cb-4cf0-804c-8663-d8ecdd5e692f/query')
		.reply(200, PAGE_2_RESPONSE);

	new NodeTestHarness().setupTests({
		workflowFiles: ['getAllPaginated.workflow.json'],
	});
});
