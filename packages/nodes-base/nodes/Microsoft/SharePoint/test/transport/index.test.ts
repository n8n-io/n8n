import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';

import { microsoftSharePointApiRequest } from '../../transport/index';

describe('Microsoft SharePoint Transport', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let mockNode: INode;
	let mockHttpRequestWithAuthentication: jest.Mock;

	beforeEach(() => {
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockHttpRequestWithAuthentication = jest.fn();
		mockExecuteFunctions.helpers.httpRequestWithAuthentication = mockHttpRequestWithAuthentication;
		mockExecuteFunctions.getNodeParameter.mockReturnValue('oAuth2');

		mockNode = {
			id: 'test-node',
			name: 'Test SharePoint Node',
			type: 'n8n-nodes-base.microsoftSharePoint',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};
		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		jest.clearAllMocks();
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	describe('microsoftSharePointApiRequest', () => {
		describe('OAuth2 authentication', () => {
			it('should use OAuth2 credential and construct URL from subdomain', async () => {
				const mockResponse = { value: [] };
				mockHttpRequestWithAuthentication.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({ subdomain: 'mytenant' });

				await microsoftSharePointApiRequest.call(mockExecuteFunctions, 'GET', '/sites');

				expect(mockHttpRequestWithAuthentication).toHaveBeenCalledWith(
					'microsoftSharePointOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						url: 'https://mytenant.sharepoint.com/_api/v2.0/sites',
					}),
				);
			});

			it('should use provided URL override when specified', async () => {
				const mockResponse = { value: [] };
				mockHttpRequestWithAuthentication.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({ subdomain: 'mytenant' });

				await microsoftSharePointApiRequest.call(
					mockExecuteFunctions,
					'GET',
					'/sites',
					{},
					undefined,
					undefined,
					'https://custom.sharepoint.com/_api/v2.0/sites',
				);

				expect(mockHttpRequestWithAuthentication).toHaveBeenCalledWith(
					'microsoftSharePointOAuth2Api',
					expect.objectContaining({
						url: 'https://custom.sharepoint.com/_api/v2.0/sites',
					}),
				);
			});
		});

		describe('service principal authentication', () => {
			it('should use service principal credential and construct URL from subdomain', async () => {
				const mockResponse = { value: [] };
				mockHttpRequestWithAuthentication.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getNodeParameter.mockReturnValue('servicePrincipal');
				mockExecuteFunctions.getCredentials.mockResolvedValue({ subdomain: 'mytenant' });

				await microsoftSharePointApiRequest.call(mockExecuteFunctions, 'GET', '/sites');

				expect(mockHttpRequestWithAuthentication).toHaveBeenCalledWith(
					'microsoftSharePointServicePrincipalApi',
					expect.objectContaining({
						method: 'GET',
						url: 'https://mytenant.sharepoint.com/_api/v2.0/sites',
					}),
				);
			});

			it('should use service principal credential with a different subdomain', async () => {
				const mockResponse = { value: [] };
				mockHttpRequestWithAuthentication.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getNodeParameter.mockReturnValue('servicePrincipal');
				mockExecuteFunctions.getCredentials.mockResolvedValue({ subdomain: 'contoso' });

				await microsoftSharePointApiRequest.call(mockExecuteFunctions, 'GET', '/sites/site1/lists');

				expect(mockHttpRequestWithAuthentication).toHaveBeenCalledWith(
					'microsoftSharePointServicePrincipalApi',
					expect.objectContaining({
						url: 'https://contoso.sharepoint.com/_api/v2.0/sites/site1/lists',
					}),
				);
			});
		});
	});
});
