import nock from 'nock';
import type { IHttpRequestMethods } from 'n8n-workflow';
import { equalityTest, setup, workflowToTests } from '@test/nodes/Helpers';

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

jest.mock('../../../../shared/GenericFunctions', () => {
	const originalModule = jest.requireActual('../../../../shared/GenericFunctions');
	return {
		...originalModule,
		notionApiRequest: jest.fn(async function (method: IHttpRequestMethods) {
			if (method === 'POST') {
				return API_RESPONSE;
			}
		}),
	};
});

describe('Test NotionV2, page => create', () => {
	const workflows = ['nodes/Notion/test/node/v2/page/create.workflow.json'];
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
