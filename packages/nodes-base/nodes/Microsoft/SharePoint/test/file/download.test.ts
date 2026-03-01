import { NodeTestHarness } from '@nodes-testing/node-test-harness';

import { credentials } from '../credentials';

describe('Microsoft SharePoint Node', () => {
	const { baseUrl } = credentials.microsoftSharePointOAuth2Api;
	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['download.workflow.json'],
		assertBinaryData: true,
		nock: {
			baseUrl,
			mocks: [
				{
					method: 'get',
					path: '/sites/site1/drive/items/item1/content',
					statusCode: 200,
					responseBody: {},
					responseHeaders: {
						'content-type': 'application/json',
						'content-disposition':
							"attachment; filename*=UTF-8''weird%20file%20%E2%82%AC%20name.json",
					},
				},
			],
		},
	});
});
