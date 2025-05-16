import { CredentialsHelper } from '@nodes-testing/credentials-helper';
import { NodeTestHarness } from '@nodes-testing/node-test-harness';

import { credentials } from '../credentials';

describe('Microsoft SharePoint Node', () => {
	const { baseUrl } = credentials.microsoftSharePointOAuth2Api;
	jest.spyOn(CredentialsHelper.prototype, 'getParentTypes').mockReturnValueOnce(['oAuth2Api']);
	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['oauth2.workflow.json'],
		nock: {
			baseUrl,
			mocks: [
				{
					method: 'get',
					path: '/sites/site1/lists/list1?%24select=id%2Cname%2CdisplayName%2Cdescription%2CcreatedDateTime%2ClastModifiedDateTime%2CwebUrl',
					statusCode: 200,
					requestHeaders: { Authorization: 'Bearer ACCESSTOKEN' },
					responseBody: {
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
				},
			],
		},
	});
});
