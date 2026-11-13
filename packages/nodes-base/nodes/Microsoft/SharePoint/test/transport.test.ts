import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath, requestUrl } from 'n8n-workflow';

import { credentials } from './credentials';
import { microsoftSharePointApiRequest } from '../transport';

describe('Microsoft SharePoint Node', () => {
	describe('Transport', () => {
		let executeFunctions: MockProxy<IExecuteFunctions>;
		let mockRequestWithAuthentication: jest.Mock;

		beforeEach(() => {
			executeFunctions = mock<IExecuteFunctions>();
			mockRequestWithAuthentication = jest.fn();
			executeFunctions.helpers.httpRequestWithAuthentication = mockRequestWithAuthentication;
		});

		afterEach(() => {
			jest.resetAllMocks();
		});

		it('should build the request URL from the subdomain and the path', async () => {
			executeFunctions.getCredentials.mockResolvedValue(credentials.microsoftSharePointOAuth2Api);

			await microsoftSharePointApiRequest.call(
				executeFunctions,
				'GET',
				requestPath`/sites/${'site1/x'}/lists`,
			);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftSharePointOAuth2Api',
				expect.objectContaining({
					url: requestUrl`https://mydomain.sharepoint.com/_api/v2.0/sites/site1%2Fx/lists`,
				}),
			);
		});

		it('should use a full URL from the API unchanged', async () => {
			executeFunctions.getCredentials.mockResolvedValue(credentials.microsoftSharePointOAuth2Api);
			const nextLink = 'https://mydomain.sharepoint.com/_api/v2.0/sites?$skiptoken=abc';

			await microsoftSharePointApiRequest.call(
				executeFunctions,
				'GET',
				requestPath`/sites`,
				{},
				undefined,
				undefined,
				nextLink,
			);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftSharePointOAuth2Api',
				expect.objectContaining({ url: nextLink }),
			);
		});

		it('should accept a full URL when the subdomain has uppercase letters', async () => {
			executeFunctions.getCredentials.mockResolvedValue({
				...credentials.microsoftSharePointOAuth2Api,
				subdomain: 'MyDomain',
			});
			const nextLink = 'https://mydomain.sharepoint.com/x';

			await microsoftSharePointApiRequest.call(
				executeFunctions,
				'GET',
				requestPath`/sites`,
				{},
				undefined,
				undefined,
				nextLink,
			);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftSharePointOAuth2Api',
				expect.objectContaining({ url: nextLink }),
			);
		});

		it.each([
			'https://other.example/_api/v2.0/sites',
			'https://mydomain.sharepoint.com.other.example/_api/v2.0/sites',
			'http://mydomain.sharepoint.com/_api/v2.0/sites',
			'not a url',
		])('should refuse the full URL %s and send no request', async (nextLink) => {
			executeFunctions.getCredentials.mockResolvedValue(credentials.microsoftSharePointOAuth2Api);

			await expect(
				microsoftSharePointApiRequest.call(
					executeFunctions,
					'GET',
					requestPath`/sites`,
					{},
					undefined,
					undefined,
					nextLink,
				),
			).rejects.toThrow('Refusing to send credentials to an unexpected host');
			expect(mockRequestWithAuthentication).not.toHaveBeenCalled();
		});

		it.each([undefined, ''])('should ask for the subdomain when it is %j', async (subdomain) => {
			executeFunctions.getCredentials.mockResolvedValue({ subdomain });

			await expect(
				microsoftSharePointApiRequest.call(executeFunctions, 'GET', requestPath`/sites`),
			).rejects.toThrow('The SharePoint subdomain is not set');
			expect(mockRequestWithAuthentication).not.toHaveBeenCalled();
		});
	});
});
