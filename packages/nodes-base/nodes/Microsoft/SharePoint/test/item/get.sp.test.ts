import { NodeTestHarness } from '@nodes-testing/node-test-harness';

import { credentials } from '../credentials';

describe('Microsoft SharePoint Node, Service Principal item:get smoke', () => {
	const harness = new NodeTestHarness();

	harness.setupTests({
		credentials,
		workflowFiles: ['get.sp.workflow.json'],
		nock: {
			baseUrl: 'https://graph.microsoft.com',
			mocks: [
				{
					method: 'get',
					path: '/v1.0/sites/site1/lists/list1/items/item1?%24select=id%2CcreatedDateTime%2ClastModifiedDateTime%2CwebUrl&%24expand=fields%28select%3DTitle%29',
					statusCode: 200,
					responseBody: {
						id: 'item1',
						createdDateTime: '2025-03-12T22:18:18Z',
						lastModifiedDateTime: '2025-03-12T22:18:18Z',
						webUrl: 'https://mydomain.sharepoint.com/sites/site1/Lists/name%20list/1_.000',
						fields: {
							Title: 'Item 1',
						},
					},
				},
			],
		},
	});
});
