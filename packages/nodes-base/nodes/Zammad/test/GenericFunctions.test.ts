import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { zammadApiRequest } from '../GenericFunctions';

describe('zammadApiRequest', () => {
	it('should encode path values and join them with the credentials base URL', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNodeParameter.mockReturnValue('tokenAuth');
		context.getCredentials.mockResolvedValue({
			baseUrl: 'https://helpdesk.example.com/',
			accessToken: 'fake-access-token',
			allowUnauthorizedCerts: false,
		});
		context.helpers.request.mockResolvedValue({});

		const id = '7/delete?x=1';
		await zammadApiRequest.call(context, 'GET', requestPath`/users/${id}`);

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://helpdesk.example.com/api/v1/users/7%2Fdelete%3Fx=1',
				}),
			}),
		);
	});
});
