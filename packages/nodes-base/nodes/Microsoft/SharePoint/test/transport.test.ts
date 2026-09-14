import type { IExecuteFunctions } from 'n8n-workflow';
import type { Mock } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';

import { credentials } from './credentials';
import { microsoftSharePointApiRequest } from '../v1/transport';

describe('Microsoft SharePoint Node', () => {
	describe('Transport', () => {
		let executeFunctions: MockProxy<IExecuteFunctions>;
		let mockRequestWithAuthentication: Mock;

		beforeEach(() => {
			executeFunctions = mock<IExecuteFunctions>();
			mockRequestWithAuthentication = vi.fn();
			executeFunctions.helpers.httpRequestWithAuthentication = mockRequestWithAuthentication;
		});

		afterEach(() => {
			vi.resetAllMocks();
		});

		it('should trim whitespace around the subdomain when building the request URL', async () => {
			executeFunctions.getCredentials.mockResolvedValue({
				...credentials.microsoftSharePointOAuth2Api,
				subdomain: ' mydomain ',
			});

			await microsoftSharePointApiRequest.call(executeFunctions, 'GET', '/sites');

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftSharePointOAuth2Api',
				expect.objectContaining({
					url: 'https://mydomain.sharepoint.com/_api/v2.0/sites',
				}),
			);
		});
	});
});
