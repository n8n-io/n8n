import { NodeTestHarness } from '@nodes-testing/node-test-harness';

import { credentials } from '../credentials';

describe('Microsoft SharePoint Node', () => {
	const { baseUrl } = credentials.microsoftSharePointOAuth2Api;
	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['get.workflow.json'],
		nock: {
			baseUrl,
			mocks: [
				{
					method: 'get',
					path: '/sites/site1/lists/list1/items/item1?%24select=id%2CcreatedDateTime%2ClastModifiedDateTime%2CwebUrl&%24expand=fields%28select%3DTitle%29',
					statusCode: 200,
					responseBody: {
						'@odata.context':
							'https://mydomain.sharepoint.com/sites/site1/_api/v2.0/$metadata#listItems/$entity',
						'@odata.etag': '"07bfcdd5-450d-48ce-8dc3-04f7f59edc5f,1"',
						createdBy: {
							user: {
								displayName: 'John Doe',
								email: 'john@doe.onmicrosoft.com',
								id: '5f7afebb-121d-4664-882b-a09fe6584ce0',
							},
						},
						createdDateTime: '2025-03-12T22:18:18Z',
						eTag: '"07bfcdd5-450d-48ce-8dc3-04f7f59edc5f,1"',
						id: 'item1',
						lastModifiedBy: {
							application: {
								id: 'b9c26603-3c9b-4050-b848-27dfab0a52fa',
								displayName: 'sharepoint-n8n-test',
							},
							user: {
								displayName: 'John Doe',
								email: 'john@doe.onmicrosoft.com',
								id: '5f7afebb-121d-4664-882b-a09fe6584ce0',
							},
						},
						lastModifiedDateTime: '2025-03-12T22:18:18Z',
						parentReference: {
							id: '84070a73-ea24-463c-8eb2-0e9afa11c63f',
							listId: 'list1',
							siteId: 'site1',
						},
						webUrl: 'https://mydomain.sharepoint.com/sites/site1/Lists/name%20list/1_.000',
						contentType: {
							id: '0x010010D603DC4CF2DF4BB8A2D75DCB4BB1B30037A4993FB4DEB0439C3DC6DEC95A9DF8',
							name: 'Item',
						},
						'fields@odata.navigationLink': 'sites/site1/lists/list1/items/item1/fields',
						fields: {
							'@odata.etag': '"07bfcdd5-450d-48ce-8dc3-04f7f59edc5f,1"',
							Title: 'Item 1',
							ID: 'item1',
							ContentType: 'Item',
							Modified: '2025-03-12T22:18:18Z',
							Created: '2025-03-12T22:18:18Z',
							AuthorLookupId: '7',
							EditorLookupId: '7',
							_UIVersionString: '1.0',
							Attachments: false,
							Edit: '',
							LinkTitleNoMenu: 'Item 1',
							LinkTitle: 'Item 1',
							ItemChildCount: '0',
							FolderChildCount: '0',
							_ComplianceFlags: '',
							_ComplianceTag: '',
							_ComplianceTagWrittenTime: '',
							_ComplianceTagUserId: '',
							AppAuthorLookupId: '5',
							AppEditorLookupId: '5',
						},
					},
				},
			],
		},
	});
});
