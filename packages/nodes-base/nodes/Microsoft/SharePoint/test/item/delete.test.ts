import { NodeTestHarness } from '@nodes-testing/node-test-harness';

import { credentials } from '../credentials';

describe('Microsoft SharePoint Node', () => {
	const { baseUrl } = credentials.microsoftSharePointOAuth2Api;
	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['delete.workflow.json'],
		nock: {
			baseUrl,
			mocks: [
				{
					method: 'delete',
					path: '/sites/site1/lists/list1/items/item1',
					statusCode: 204,
					responseBody: {},
				},
			],
		},
	});
});
