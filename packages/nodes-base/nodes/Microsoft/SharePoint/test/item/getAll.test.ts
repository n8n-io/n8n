import { NodeTestHarness } from '@nodes-testing/node-test-harness';

import { credentials } from '../credentials';

describe('Microsoft SharePoint Node', () => {
	const { baseUrl } = credentials.microsoftSharePointOAuth2Api;
	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['getAll.workflow.json'],
		nock: {
			baseUrl,
			mocks: [
				{
					method: 'get',
					path: '/sites/site1/lists/list1/items?%24select%5B0%5D=contentType&%24select%5B1%5D=createdDateTime&%24select%5B2%5D=createdBy&%24select%5B3%5D=fields&%24select%5B4%5D=id&%24select%5B5%5D=lastModifiedDateTime&%24select%5B6%5D=lastModifiedBy&%24select%5B7%5D=parentReference&%24select%5B8%5D=webUrl',
					statusCode: 200,
					responseBody: {
						value: [
							{
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
						],
						'@odata.nextLink':
							'https://mydomain.sharepoint.com/_api/v2.0/sites(%27site1%27)/lists(%27list1%27)/items?%24skiptoken=UGFnZWQ9VFJVRSZwX0lEPTE&%24top=1&%24expand=fields&%24select%5b0%5d=contentType&%24select%5b1%5d=createdDateTime&%24select%5b2%5d=createdBy&%24select%5b3%5d=fields&%24select%5b4%5d=id&%24select%5b5%5d=lastModifiedDateTime&%24select%5b6%5d=lastModifiedBy&%24select%5b7%5d=parentReference&%24select%5b8%5d=webUrl',
					},
				},
				{
					method: 'get',
					path: '/sites(%27site1%27)/lists(%27list1%27)/items?%24skiptoken=UGFnZWQ9VFJVRSZwX0lEPTE&%24top=1&%24expand=fields&%24select%5b0%5d=contentType&%24select%5b1%5d=createdDateTime&%24select%5b2%5d=createdBy&%24select%5b3%5d=fields&%24select%5b4%5d=id&%24select%5b5%5d=lastModifiedDateTime&%24select%5b6%5d=lastModifiedBy&%24select%5b7%5d=parentReference&%24select%5b8%5d=webUrl',
					statusCode: 200,
					responseBody: {
						value: [
							{
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
								id: 'item2',
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
									Title: 'Item 2',
									ID: 'item2',
									ContentType: 'Item',
									Modified: '2025-03-12T22:18:18Z',
									Created: '2025-03-12T22:18:18Z',
									AuthorLookupId: '7',
									EditorLookupId: '7',
									_UIVersionString: '1.0',
									Attachments: false,
									Edit: '',
									LinkTitleNoMenu: 'Item 2',
									LinkTitle: 'Item 2',
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
						],
					},
				},
			],
		},
	});
});
