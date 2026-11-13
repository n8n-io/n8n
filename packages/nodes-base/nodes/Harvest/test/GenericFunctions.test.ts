import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { harvestApiRequest } from '../GenericFunctions';

describe('harvestApiRequest', () => {
	it('should encode path values in the request URL', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNodeParameter.mockImplementation((name: string) =>
			name === 'accountId' ? '1234567' : 'accessToken',
		);
		context.getCredentials.mockResolvedValue({ accessToken: 'fake-access-token' });
		context.helpers.request.mockResolvedValue({});

		const id = '42/delete?x=1';
		await harvestApiRequest.call(context, 'GET', {}, requestPath`users/${id}`);

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://api.harvestapp.com/v2/users/42%2Fdelete%3Fx=1',
				}),
			}),
		);
	});
});
