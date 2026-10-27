import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

function makeBlock(id: string, parentBlockId: string, text: string) {
	return {
		object: 'block',
		id,
		parent: { type: 'block_id', block_id: parentBlockId },
		created_time: '2024-01-01T00:00:00.000Z',
		last_edited_time: '2024-01-01T00:00:00.000Z',
		created_by: { object: 'user', id: '88f72c1a-07ed-4bae-9fa0-231365d813d9' },
		last_edited_by: { object: 'user', id: '88f72c1a-07ed-4bae-9fa0-231365d813d9' },
		has_children: false,
		archived: false,
		in_trash: false,
		type: 'paragraph',
		paragraph: {
			color: 'default',
			text: [
				{
					type: 'text',
					text: { content: text, link: null },
					annotations: {
						bold: false,
						italic: false,
						strikethrough: false,
						underline: false,
						code: false,
						color: 'default',
					},
					plain_text: text,
					href: null,
				},
			],
		},
	};
}

const PARENT_BLOCK_ID = 'aabb0011-aabb-0011-aabb-0011aabb0011';

const PAGE_1_RESPONSE = {
	results: [
		makeBlock('b0000001-0000-0000-0000-000000000001', PARENT_BLOCK_ID, 'Block 1'),
		makeBlock('b0000002-0000-0000-0000-000000000002', PARENT_BLOCK_ID, 'Block 2'),
		makeBlock('b0000003-0000-0000-0000-000000000003', PARENT_BLOCK_ID, 'Block 3'),
	],
	has_more: true,
	next_cursor: 'cursor-page2',
};

const PAGE_2_RESPONSE = {
	results: [
		makeBlock('b0000004-0000-0000-0000-000000000004', PARENT_BLOCK_ID, 'Block 4'),
		makeBlock('b0000005-0000-0000-0000-000000000005', PARENT_BLOCK_ID, 'Block 5'),
	],
	has_more: false,
};

describe('Test NotionV2, block => getAll with pagination', () => {
	nock('https://api.notion.com')
		.get('/v1/blocks/aabb0011aabb0011aabb0011aabb0011/children')
		.query(true)
		.reply(200, PAGE_1_RESPONSE)
		.get('/v1/blocks/aabb0011aabb0011aabb0011aabb0011/children')
		.query(true)
		.reply(200, PAGE_2_RESPONSE);

	new NodeTestHarness().setupTests({
		workflowFiles: ['getAllPaginated.workflow.json'],
	});
});
