import { NodeTestHarness } from '@nodes-testing/node-test-harness';

import { credentials } from '../credentials';

describe('Microsoft SharePoint Node', () => {
	const { baseUrl } = credentials.microsoftSharePointOAuth2Api;
	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['update.workflow.json'],
		nock: {
			baseUrl,
			mocks: [
				{
					method: 'patch',
					path: '/sites/site1/lists/list1/items/item1',
					statusCode: 200,
					requestBody: {
						fields: {
							Title: 'Title 2',
						},
					},
					responseBody: {
						'@odata.context':
							'https://mydomain.sharepoint.com/sites/site1/_api/v2.0/$metadata#listItems/$entity',
						'@odata.etag': '"cc40561f-3d3b-4cfb-b8a9-8af9d71de3f0,2"',
						createdBy: {
							user: {
								displayName: 'John Doe',
								email: 'john@doe.onmicrosoft.com',
								id: '5f7afebb-121d-4664-882b-a09fe6584ce0',
							},
						},
						createdDateTime: '2025-03-25T12:26:12Z',
						eTag: '"cc40561f-3d3b-4cfb-b8a9-8af9d71de3f0,2"',
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
						lastModifiedDateTime: '2025-03-25T12:26:46Z',
						parentReference: {
							id: '84070a73-ea24-463c-8eb2-0e9afa11c63f',
							listId: 'list1',
							siteId: 'site1',
						},
						webUrl: 'https://mydomain.sharepoint.com/sites/site1/Lists/name%20list/3_.000',
						contentType: {
							id: '0x010010D603DC4CF2DF4BB8A2D75DCB4BB1B30037A4993FB4DEB0439C3DC6DEC95A9DF8',
							name: 'Item',
						},
						'fields@odata.navigationLink': 'sites/site1/lists/list1/items/item1/fields',
						fields: {
							'@odata.etag': '"cc40561f-3d3b-4cfb-b8a9-8af9d71de3f0,2"',
							Title: 'Title 2',
							ID: 'item1',
							ContentType: 'Item',
							Modified: '2025-03-25T12:26:46Z',
							Created: '2025-03-25T12:26:12Z',
							AuthorLookupId: '7',
							EditorLookupId: '7',
							_UIVersionString: '2.0',
							Attachments: false,
							Edit: '',
							LinkTitleNoMenu: 'Title 2',
							LinkTitle: 'Title 2',
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
