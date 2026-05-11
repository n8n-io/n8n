import { CredentialsHelper } from '@nodes-testing/credentials-helper';
import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';

describe('Microsoft SharePoint Node - Token Refresh', () => {
	const { baseUrl } = credentials.microsoftSharePointOAuth2Api;
	const tokenRefreshUrl = 'https://login.microsoftonline.com';
	const itemPath =
		'/sites/site1/lists/list1/items/item1?%24select=id%2CcreatedDateTime%2ClastModifiedDateTime%2CwebUrl&%24expand=fields%28select%3DTitle%29';

	let updateCredentialsSpy: jest.SpyInstance;

	beforeAll(() => {
		// Mock the credential helper to return oAuth2Api as parent type
		jest.spyOn(CredentialsHelper.prototype, 'getParentTypes').mockReturnValue(['oAuth2Api']);
	});

	beforeEach(() => {
		// Spy on the updateCredentialsOauthTokenData to verify token refresh
		updateCredentialsSpy = jest
			.spyOn(CredentialsHelper.prototype, 'updateCredentialsOauthTokenData')
			.mockResolvedValue();

		// Set up mocks for token refresh scenario
		// First request: Return 401 Unauthorized (expired token)
		nock(baseUrl)
			.get(itemPath)
			.matchHeader('Authorization', 'Bearer ACCESSTOKEN')
			.reply(401, {
				error: {
					code: 'InvalidAuthenticationToken',
					message: 'Access token has expired.',
				},
			});

		// Token refresh request
		nock(tokenRefreshUrl).post('/common/oauth2/v2.0/token').reply(200, {
			token_type: 'Bearer',
			scope:
				'https://mydomain.sharepoint.com/Sites.Manage.All https://mydomain.sharepoint.com/.default',
			expires_in: 3599,
			ext_expires_in: 3599,
			access_token: 'NEWACCESSTOKEN',
			refresh_token: 'NEWREFRESHTOKEN',
		});

		// Retry request with new token: Return success
		nock(baseUrl)
			.get(itemPath)
			.matchHeader('Authorization', 'Bearer NEWACCESSTOKEN')
			.reply(200, {
				'@odata.context':
					'https://mydomain.sharepoint.com/sites/site1/_api/v2.0/$metadata#listItems/$entity',
				'@odata.etag': '"07bfcdd5-450d-48ce-8dc3-04f7f59edc5f,1"',
				id: 'item1',
				createdDateTime: '2025-03-12T22:18:18Z',
				lastModifiedDateTime: '2025-03-12T22:18:18Z',
				webUrl: 'https://mydomain.sharepoint.com/sites/site1/Lists/name%20list/1_.000',
				'fields@odata.navigationLink': 'sites/site1/lists/list1/items/item1/fields',
				fields: {
					'@odata.etag': '"07bfcdd5-450d-48ce-8dc3-04f7f59edc5f,1"',
					Title: 'Item 1',
				},
			});
	});

	afterEach(() => {
		nock.cleanAll();
	});

	afterAll(() => {
		jest.restoreAllMocks();
	});

	// Use the harness's setupTests to automatically run the workflow
	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['getTokenRefresh.workflow.json'],
		customAssertions: () => {
			// Verify the token was refreshed and saved
			expect(updateCredentialsSpy).toHaveBeenCalledTimes(1);
			expect(updateCredentialsSpy.mock.calls[0][1]).toBe('microsoftSharePointOAuth2Api');
			expect(updateCredentialsSpy.mock.calls[0][2]).toMatchObject({
				oauthTokenData: expect.objectContaining({
					access_token: 'NEWACCESSTOKEN',
					refresh_token: 'NEWREFRESHTOKEN',
				}),
			});

			// Verify all nock interceptors were called (401 -> refresh -> retry)
			expect(nock.isDone()).toBe(true);
		},
	});
});
