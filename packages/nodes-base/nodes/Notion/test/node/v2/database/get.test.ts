import nock from 'nock';
import type { IHttpRequestMethods } from 'n8n-workflow';
import { equalityTest, setup, workflowToTests } from '@test/nodes/Helpers';

const API_RESPONSE = {
	object: 'database',
	id: '138fb9cb-4cf0-804c-8663-d8ecdd5e692f',
	cover: null,
	icon: null,
	created_time: '2024-11-08T07:59:00.000Z',
	created_by: {
		object: 'user',
		id: '88f72c1a-07ed-4bae-9fa0-231365d813d9',
	},
	last_edited_by: {
		object: 'user',
		id: '88f72c1a-07ed-4bae-9fa0-231365d813d9',
	},
	last_edited_time: '2024-11-08T07:59:00.000Z',
	title: [
		{
			type: 'text',
			text: {
				content: 'TEST_DB',
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
			plain_text: 'TEST_DB',
			href: null,
		},
	],
	description: [],
	is_inline: false,
	properties: {
		Tags: {
			id: '%40~Tp',
			name: 'Tags',
			type: 'multi_select',
			multi_select: {
				options: [],
			},
		},
		Name: {
			id: 'title',
			name: 'Name',
			type: 'title',
			title: {},
		},
	},
	parent: {
		type: 'page_id',
		page_id: 'cc3d2b3c-f31a-4773-ab39-17a60c54567a',
	},
	url: 'https://www.notion.so/138fb9cb4cf0804c8663d8ecdd5e692f',
	public_url: null,
	archived: false,
	in_trash: false,
	request_id: 'd22a9046-be0d-4ef5-b551-8691da552d47',
};

jest.mock('../../../../shared/GenericFunctions', () => {
	const originalModule = jest.requireActual('../../../../shared/GenericFunctions');
	return {
		...originalModule,
		notionApiRequest: jest.fn(async function (method: IHttpRequestMethods) {
			if (method === 'GET') {
				return API_RESPONSE;
			}
		}),
	};
});

describe('Test NotionV2, database => get', () => {
	const workflows = ['nodes/Notion/test/node/v2/database/get.workflow.json'];
	const tests = workflowToTests(workflows);

	beforeAll(() => {
		nock.disableNetConnect();
	});

	afterAll(() => {
		nock.restore();
		jest.unmock('../../../../shared/GenericFunctions');
	});

	const nodeTypes = setup(tests);

	for (const testData of tests) {
		test(testData.description, async () => await equalityTest(testData, nodeTypes));
	}
});
