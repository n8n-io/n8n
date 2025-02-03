import type { IHttpRequestMethods } from 'n8n-workflow';

import { equalityTest, setup, workflowToTests } from '@test/nodes/Helpers';

const API_RESPONSE = {
	object: 'page',
	id: '15bfb9cb-4cf0-81c7-aab4-c5855b8cb6c3',
	created_time: '2024-12-13T04:45:00.000Z',
	last_edited_time: '2024-12-13T05:21:00.000Z',
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
						content: 'Updated Name',
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
					plain_text: 'Updated Name',
					href: null,
				},
			],
		},
	},
	url: 'https://www.notion.so/Updated-Name-15bfb9cb4cf081c7aab4c5855b8cb6c3',
	public_url: null,
	request_id: 'a4683091-f165-4f10-92b4-a629b8b1266e',
};

jest.mock('../../../../shared/GenericFunctions', () => {
	const originalModule = jest.requireActual('../../../../shared/GenericFunctions');
	return {
		...originalModule,
		notionApiRequest: jest.fn(async function (method: IHttpRequestMethods) {
			if (method === 'PATCH') {
				return API_RESPONSE;
			}
		}),
	};
});

describe('Test NotionV2, databasePage => update', () => {
	const workflows = ['nodes/Notion/test/node/v2/databasePage/update.workflow.json'];
	const tests = workflowToTests(workflows);
	const nodeTypes = setup(tests);

	for (const testData of tests) {
		test(testData.description, async () => await equalityTest(testData, nodeTypes));
	}
});
