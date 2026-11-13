import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';
import { mockDeep } from 'jest-mock-extended';

import { netlifyApiRequest } from '../GenericFunctions';

describe('netlifyApiRequest', () => {
	it('should encode path values', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({ accessToken: 'fake-access-token' });
		context.helpers.request.mockResolvedValue({});

		const siteId = 'abc/accounts';
		await netlifyApiRequest.call(context, 'GET', requestPath`/sites/${siteId}`);

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://api.netlify.com/api/v1/sites/abc%2Faccounts',
				}),
			}),
		);
	});
});
