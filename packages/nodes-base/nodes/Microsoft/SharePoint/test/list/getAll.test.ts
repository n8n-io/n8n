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
					path: '/sites/site1/lists?%24select=id%2Cname%2CdisplayName%2Cdescription%2CcreatedDateTime%2ClastModifiedDateTime%2CwebUrl',
					statusCode: 200,
					responseBody: {
						value: [
							{
								'@odata.context':
									'https://mydomain.sharepoint.com/sites/site1/_api/v2.0/$metadata#lists/$entity',
								'@odata.etag': '"58a279af-1f06-4392-a5ed-2b37fa1d6c1d,5"',
								createdDateTime: '2025-03-12T19:38:40Z',
								description: 'My List 1',
								id: '58a279af-1f06-4392-a5ed-2b37fa1d6c1d',
								lastModifiedDateTime: '2025-03-12T22:18:18Z',
								name: 'list1',
								webUrl: 'https://mydomain.sharepoint.com/sites/site1/Lists/name%20list',
								displayName: 'list1',
							},
						],
						'@odata.nextLink':
							'https://mydomain.sharepoint.com/_api/v2.0/sites(%27mydomain.sharepoint.com,site1%27)/lists?%24skiptoken=aWQ9MjFFQkEzOUMtMkU3My00NzgwLUFBQzEtMTVDNzlDMTk4QjlB&%24top=1&%24select=id%2cname%2cdisplayName%2cdescription%2ccreatedDateTime%2clastModifiedDateTime%2cwebUrl',
					},
				},
				{
					method: 'get',
					path: '/sites(%27mydomain.sharepoint.com,site1%27)/lists?%24skiptoken=aWQ9MjFFQkEzOUMtMkU3My00NzgwLUFBQzEtMTVDNzlDMTk4QjlB&%24top=1&%24select=id%2cname%2cdisplayName%2cdescription%2ccreatedDateTime%2clastModifiedDateTime%2cwebUrl',
					statusCode: 200,
					responseBody: {
						value: [
							{
								'@odata.context':
									'https://mydomain.sharepoint.com/sites/site1/_api/v2.0/$metadata#lists/$entity',
								'@odata.etag': '"58a279af-1f06-4392-a5ed-2b37fa1d6c1d,5"',
								createdDateTime: '2025-03-12T19:38:40Z',
								description: 'My List 2',
								id: '58a279af-1f06-4392-a5ed-2b37fa1d6c1d',
								lastModifiedDateTime: '2025-03-12T22:18:18Z',
								name: 'list2',
								webUrl: 'https://mydomain.sharepoint.com/sites/site1/Lists/name%20list',
								displayName: 'list2',
							},
						],
					},
				},
			],
		},
	});
});
