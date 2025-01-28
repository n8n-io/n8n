import type { IHttpRequestMethods } from 'n8n-workflow';

import { equalityTest, setup, workflowToTests } from '@test/nodes/Helpers';

const API_RESPONSE = {
	object: 'user',
	id: '34a945c6-de97-4efc-90d6-6d7cc14a6583',
	name: 'second',
	avatar_url: null,
	type: 'bot',
	bot: {},
	request_id: 'ad2a00c0-fa6a-4a14-bf9a-68e1715b51a1',
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

describe('Test NotionV2, user => get', () => {
	const workflows = ['nodes/Notion/test/node/v2/user/get.workflow.json'];
	const tests = workflowToTests(workflows);
	const nodeTypes = setup(tests);

	for (const testData of tests) {
		test(testData.description, async () => await equalityTest(testData, nodeTypes));
	}
});
