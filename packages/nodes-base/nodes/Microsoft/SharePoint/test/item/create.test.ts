import { NodeTestHarness } from '@nodes-testing/node-test-harness';

import { credentials } from '../credentials';

describe('Microsoft SharePoint Node', () => {
	const { baseUrl } = credentials.microsoftSharePointOAuth2Api;
	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['create.workflow.json'],
		nock: {
			baseUrl,
			mocks: [
				{
					method: 'post',
					path: '/sites/site1/lists/list1/items',
					statusCode: 201,
					requestBody: {
						fields: {
							bool: true,
							Title: 'Title 1',
							choice: 'Choice 1',
							datetime: '2025-03-24T00:00:00',
							number: 1,
							currency: 1,
							LikesCount: 1,
							RatingCount: 1,
							AverageRating: 1,
							person: '1',
							lookup: '1',
							image:
								'{"type":"thumbnail","fileName":"file.jpg","nativeFile":{},"fieldName":"Picture","serverUrl":"https://mydomain.sharepoint.com","fieldId":"image","serverRelativeUrl":"/sites/site1/SiteAssets/Lists/list1/file.jpg","id":"image"}',
						},
					},
					responseBody: {
						'@odata.context':
							'https://mydomain.sharepoint.com/sites/site1/_api/v2.0/$metadata#listItems/$entity',
						'@odata.etag': '"625d681e-2ce3-4c2b-a490-7c8404a31427,1"',
						createdBy: {
							user: {
								displayName: 'John Doe',
								email: 'john@doe.onmicrosoft.com',
								id: '5f7afebb-121d-4664-882b-a09fe6584ce0',
							},
						},
						createdDateTime: '2025-03-25T20:07:23Z',
						eTag: '"625d681e-2ce3-4c2b-a490-7c8404a31427,1"',
						id: '1',
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
						lastModifiedDateTime: '2025-03-25T20:07:23Z',
						parentReference: {
							id: '0ead9135-9622-4b6d-b319-6b8810a6dc60',
							listId: 'list1',
							siteId: 'site1',
						},
						webUrl: 'https://mydomain.sharepoint.com/sites/n8ntest10/Lists/test/41_.000',
						contentType: {
							id: '0x0100362657F7588C5C438072A77E0EF184F4000272C0D1046D984B8097B3C00D199EDE',
							name: 'Item',
						},
						'fields@odata.navigationLink': 'sites/site1/lists/list1/items/1/fields',
						fields: {
							'@odata.etag': '"625d681e-2ce3-4c2b-a490-7c8404a31427,1"',
							Title: 'Title 1',
							choice: 'Choice 1',
							datetime: '2025-03-24T07:00:00Z',
							number: 1,
							bool: true,
							currency: 1,
							image:
								'{"type":"thumbnail","fileName":"file.jpg","nativeFile":{},"fieldName":"Picture","serverUrl":"https://mydomain.sharepoint.com","fieldId":"image","serverRelativeUrl":"/sites/site1/SiteAssets/Lists/list1/file.jpg","id":"image"}',
							AverageRating: 1,
							ID: 1,
							ContentType: 'Item',
							Modified: '2025-03-25T20:07:23Z',
							Created: '2025-03-25T20:07:23Z',
							AuthorLookupId: '1',
							EditorLookupId: '1',
							_UIVersionString: '1.0',
							Attachments: false,
							Edit: '',
							LinkTitleNoMenu: 'Title 1',
							LinkTitle: 'Title 1',
							ItemChildCount: '0',
							FolderChildCount: '0',
							_ComplianceFlags: '',
							_ComplianceTag: '',
							_ComplianceTagWrittenTime: '',
							_ComplianceTagUserId: '',
							AppAuthorLookupId: '1',
							AppEditorLookupId: '1',
						},
					},
				},
			],
		},
	});
});
