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
					path: '/sites/site1/drive/items/item1',
					statusCode: 200,
					responseBody: {
						'@odata.context':
							'https://mydomain.sharepoint.com/sites/site1/_api/v2.0/$metadata#items/$entity',
						'@content.downloadUrl':
							'https://mydomain.sharepoint.com/sites/site1/_layouts/15/download.aspx?UniqueId=d86f89ab-378e-43bc-8d46-18d2f52bd603',
						createdBy: {
							application: {
								id: 'b9c26603-3c9b-4050-b848-27dfab0a52fa',
								displayName: 'sharepoint-n8n-test',
							},
							user: {
								email: 'john@doe.onmicrosoft.com',
								id: '5f7afebb-121d-4664-882b-a09fe6584ce0',
								displayName: 'John Doe',
							},
						},
						createdDateTime: '2025-03-13T19:23:53Z',
						eTag: '"{D86F89AB-378E-43BC-8D46-18D2F52BD603},3"',
						id: '01SPEVVYFLRFX5RDRXXRBY2RQY2L2SXVQD',
						lastModifiedBy: {
							application: {
								id: 'b9c26603-3c9b-4050-b848-27dfab0a52fa',
								displayName: 'sharepoint-n8n-test',
							},
							user: {
								email: 'john@doe.onmicrosoft.com',
								id: '5f7afebb-121d-4664-882b-a09fe6584ce0',
								displayName: 'John Doe',
							},
						},
						lastModifiedDateTime: '2025-03-24T19:48:25Z',
						name: 'file2.json',
						parentReference: {
							driveType: 'documentLibrary',
							driveId: 'b!HXyh83lynUOhdUenWLZcmP1mvjoj7J9Gq8YzLjqVv3W_vPrVy_93T7lzoXbjRjzK',
							id: '01SPEVVYBKV2ZKHGJASRA2HC7MOGBMUMAA',
							name: 'folder1',
							path: '/drive/root:/folder1',
							siteId: 'f3a17c1d-7279-439d-a175-47a758b65c98',
						},
						webUrl:
							'https://mydomain.sharepoint.com/sites/site1/Shared%20Documents/folder1/file2.json',
						cTag: '"c:{D86F89AB-378E-43BC-8D46-18D2F52BD603},2"',
						file: {
							hashes: {
								quickXorHash: 'jY7BcIP9Th3EZ4PMCLrv4DnQTY4=',
							},
							irmEffectivelyEnabled: false,
							irmEnabled: false,
							mimeType: 'application/json',
						},
						fileSystemInfo: {
							createdDateTime: '2025-03-13T19:23:53Z',
							lastModifiedDateTime: '2025-03-24T19:48:25Z',
						},
						shared: {
							effectiveRoles: ['write'],
							scope: 'users',
						},
						size: 37,
					},
				},
				{
					method: 'put',
					path: '/sites/site1/drive/items/item1/content',
					statusCode: 200,
					responseBody: {
						'@odata.context':
							'https://mydomain.sharepoint.com/sites/site1/_api/v2.0/$metadata#items/$entity',
						'@content.downloadUrl':
							'https://mydomain.sharepoint.com/sites/site1/_layouts/15/download.aspx?UniqueId=d86f89ab-378e-43bc-8d46-18d2f52bd603',
						createdBy: {
							application: {
								id: 'b9c26603-3c9b-4050-b848-27dfab0a52fa',
								displayName: 'sharepoint-n8n-test',
							},
							user: {
								email: 'john@doe.onmicrosoft.com',
								id: '5f7afebb-121d-4664-882b-a09fe6584ce0',
								displayName: 'John Doe',
							},
						},
						createdDateTime: '2025-03-13T19:23:53Z',
						eTag: '"{D86F89AB-378E-43BC-8D46-18D2F52BD603},3"',
						id: '01SPEVVYFLRFX5RDRXXRBY2RQY2L2SXVQD',
						lastModifiedBy: {
							application: {
								id: 'b9c26603-3c9b-4050-b848-27dfab0a52fa',
								displayName: 'sharepoint-n8n-test',
							},
							user: {
								email: 'john@doe.onmicrosoft.com',
								id: '5f7afebb-121d-4664-882b-a09fe6584ce0',
								displayName: 'John Doe',
							},
						},
						lastModifiedDateTime: '2025-03-24T19:48:35Z',
						name: 'file2.json',
						parentReference: {
							driveType: 'documentLibrary',
							driveId: 'b!HXyh83lynUOhdUenWLZcmP1mvjoj7J9Gq8YzLjqVv3W_vPrVy_93T7lzoXbjRjzK',
							id: '01SPEVVYBKV2ZKHGJASRA2HC7MOGBMUMAA',
							name: 'folder1',
							path: '/drive/root:/folder1',
							siteId: 'f3a17c1d-7279-439d-a175-47a758b65c98',
						},
						webUrl:
							'https://mydomain.sharepoint.com/sites/site1/Shared%20Documents/folder1/file2.json',
						cTag: '"c:{D86F89AB-378E-43BC-8D46-18D2F52BD603},2"',
						file: {
							hashes: {
								quickXorHash: 'jY7BcIP9Th3EZ4PMCLrv4DnQTY4=',
							},
							irmEffectivelyEnabled: false,
							irmEnabled: false,
							mimeType: 'application/json',
						},
						fileSystemInfo: {
							createdDateTime: '2025-03-13T19:23:53Z',
							lastModifiedDateTime: '2025-03-24T19:48:25Z',
						},
						shared: {
							effectiveRoles: ['write'],
							scope: 'users',
						},
						size: 37,
					},
				},
			],
		},
	});
});
