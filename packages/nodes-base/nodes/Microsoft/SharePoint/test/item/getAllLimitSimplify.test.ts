import { NodeTestHarness } from '@nodes-testing/node-test-harness';

import { credentials } from '../credentials';

describe('Microsoft SharePoint Node', () => {
	const { baseUrl } = credentials.microsoftSharePointOAuth2Api;
	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['getAllLimitSimplify.workflow.json'],
		nock: {
			baseUrl,
			mocks: [
				{
					method: 'get',
					path: '/sites/site1/lists/list1/items?%24top=2&%24select=id%2CcreatedDateTime%2ClastModifiedDateTime%2CwebUrl&%24expand=fields%28select%3DTitle%29',
					statusCode: 200,
					responseBody: {
						value: [
							{
								'@odata.context':
									'https://mydomain.sharepoint.com/sites/site1/_api/v2.0/$metadata#listItems/$entity',
								'@odata.etag': '"07bfcdd5-450d-48ce-8dc3-04f7f59edc5f,1"',
								createdDateTime: '2025-03-12T22:18:18Z',
								id: 'item1',
								lastModifiedDateTime: '2025-03-12T22:18:18Z',
								webUrl: 'https://mydomain.sharepoint.com/sites/site1/Lists/name%20list/1_.000',
								'fields@odata.navigationLink': 'sites/site1/lists/list1/items/item1/fields',
								fields: {
									'@odata.etag': '"07bfcdd5-450d-48ce-8dc3-04f7f59edc5f,1"',
									Title: 'Item 1',
								},
							},
							{
								'@odata.context':
									'https://mydomain.sharepoint.com/sites/site1/_api/v2.0/$metadata#listItems/$entity',
								'@odata.etag': '"07bfcdd5-450d-48ce-8dc3-04f7f59edc5f,1"',
								createdDateTime: '2025-03-12T22:18:18Z',
								id: 'item2',
								lastModifiedDateTime: '2025-03-12T22:18:18Z',
								webUrl: 'https://mydomain.sharepoint.com/sites/site1/Lists/name%20list/1_.000',
								'fields@odata.navigationLink': 'sites/site1/lists/list1/items/item1/fields',
								fields: {
									'@odata.etag': '"07bfcdd5-450d-48ce-8dc3-04f7f59edc5f,1"',
									Title: 'Item 2',
								},
							},
						],
						'@odata.nextLink':
							'https://mydomain.sharepoint.com/_api/v2.0/sites(%27site1%27)/lists(%27list1%27)/items?%24skiptoken=UGFnZWQ9VFJVRSZwX0lEPTE&%24top=1&%24expand=fields&%24select%5b0%5d=contentType&%24select%5b1%5d=createdDateTime&%24select%5b2%5d=createdBy&%24select%5b3%5d=fields&%24select%5b4%5d=id&%24select%5b5%5d=lastModifiedDateTime&%24select%5b6%5d=lastModifiedBy&%24select%5b7%5d=parentReference&%24select%5b8%5d=webUrl',
					},
				},
			],
		},
	});
});
