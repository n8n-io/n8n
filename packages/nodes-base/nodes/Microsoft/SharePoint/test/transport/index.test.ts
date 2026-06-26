import type { IExecuteFunctions } from 'n8n-workflow';
import type { Mock, Mocked } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import { getSharePointCredentialType, microsoftSharePointApiRequest } from '../../transport';
import { credentials } from '../credentials';

describe('Microsoft SharePoint Transport', () => {
	let executeFunctions: Mocked<IExecuteFunctions>;
	let mockHttpRequestWithAuthentication: Mock;

	beforeEach(() => {
		executeFunctions = mockDeep<IExecuteFunctions>();
		mockHttpRequestWithAuthentication = vi.fn();
		executeFunctions.helpers.httpRequestWithAuthentication = mockHttpRequestWithAuthentication;
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe('getSharePointCredentialType', () => {
		it('defaults to OAuth2 when authentication parameter is not set', () => {
			executeFunctions.getNodeParameter.mockReturnValue(undefined as any);
			const result = getSharePointCredentialType.call(executeFunctions);
			expect(result).toBe('microsoftSharePointOAuth2Api');
		});

		it('returns OAuth2 when authentication is set to OAuth2', () => {
			executeFunctions.getNodeParameter.mockReturnValue('microsoftSharePointOAuth2Api');
			const result = getSharePointCredentialType.call(executeFunctions);
			expect(result).toBe('microsoftSharePointOAuth2Api');
		});

		it('returns Service Principal when authentication is set to SP', () => {
			executeFunctions.getNodeParameter.mockReturnValue('microsoftEntraServicePrincipalApi');
			const result = getSharePointCredentialType.call(executeFunctions);
			expect(result).toBe('microsoftEntraServicePrincipalApi');
		});
	});

	describe('microsoftSharePointApiRequest', () => {
		it('OAuth2 path uses SharePoint host and OAuth2 credential — regression guard', async () => {
			executeFunctions.getCredentials.mockResolvedValue(credentials.microsoftSharePointOAuth2Api);
			mockHttpRequestWithAuthentication.mockResolvedValue({ value: [] });

			await microsoftSharePointApiRequest.call(
				executeFunctions,
				'GET',
				'/sites/site1/lists',
				{},
				{},
				{},
				undefined,
				'microsoftSharePointOAuth2Api',
			);

			expect(mockHttpRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftSharePointOAuth2Api',
				expect.objectContaining({
					url: 'https://mydomain.sharepoint.com/_api/v2.0/sites/site1/lists',
				}),
			);
		});

		it('Service Principal path uses graph host and SP credential', async () => {
			executeFunctions.getCredentials.mockResolvedValue(
				credentials.microsoftEntraServicePrincipalApi,
			);
			mockHttpRequestWithAuthentication.mockResolvedValue({ value: [] });

			await microsoftSharePointApiRequest.call(
				executeFunctions,
				'GET',
				'/sites/site1/lists',
				{},
				{},
				{},
				undefined,
				'microsoftEntraServicePrincipalApi',
			);

			expect(mockHttpRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftEntraServicePrincipalApi',
				expect.objectContaining({
					url: 'https://graph.microsoft.com/v1.0/sites/site1/lists',
				}),
			);
		});

		it('Service Principal respects a custom graphApiBaseUrl', async () => {
			executeFunctions.getCredentials.mockResolvedValue({
				...credentials.microsoftEntraServicePrincipalApi,
				graphApiBaseUrl: 'https://graph.microsoft.us',
			});
			mockHttpRequestWithAuthentication.mockResolvedValue({ value: [] });

			await microsoftSharePointApiRequest.call(
				executeFunctions,
				'GET',
				'/sites/site1/lists',
				{},
				{},
				{},
				undefined,
				'microsoftEntraServicePrincipalApi',
			);

			expect(mockHttpRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftEntraServicePrincipalApi',
				expect.objectContaining({
					url: 'https://graph.microsoft.us/v1.0/sites/site1/lists',
				}),
			);
		});

		it('absolute url passthrough bypasses base URL construction (pagination)', async () => {
			executeFunctions.getCredentials.mockResolvedValue(
				credentials.microsoftEntraServicePrincipalApi,
			);
			mockHttpRequestWithAuthentication.mockResolvedValue({ value: [] });
			const absoluteUrl = 'https://graph.microsoft.com/v1.0/sites?$skiptoken=abc123';

			await microsoftSharePointApiRequest.call(
				executeFunctions,
				'GET',
				'/sites',
				{},
				{},
				{},
				absoluteUrl,
				'microsoftEntraServicePrincipalApi',
			);

			expect(mockHttpRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftEntraServicePrincipalApi',
				expect.objectContaining({ url: absoluteUrl }),
			);
		});
	});
});
