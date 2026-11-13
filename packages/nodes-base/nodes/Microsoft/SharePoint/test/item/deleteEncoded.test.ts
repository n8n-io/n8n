import { NodeTestHarness } from '@nodes-testing/node-test-harness';

import { credentials } from '../credentials';

describe('Microsoft SharePoint Node', () => {
	const { baseUrl } = credentials.microsoftSharePointOAuth2Api;
	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['deleteEncoded.workflow.json'],
		nock: {
			baseUrl,
			mocks: [
				{
					method: 'delete',
					path: '/sites/host%2Cguid1%2Cguid2/lists/list1/items/1%2Fdrive%2Fitems%2FF',
					statusCode: 204,
					responseBody: {},
				},
			],
		},
	});
});
