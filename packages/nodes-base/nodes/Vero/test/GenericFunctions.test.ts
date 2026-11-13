import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { veroApiRequest } from '../GenericFunctions';

describe('veroApiRequest', () => {
	it('should encode a path value that contains a slash', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({ authToken: 'fake-auth-token' });
		context.helpers.request.mockResolvedValue({});

		const id = '1234/delete?x=1';
		await veroApiRequest.call(context, 'POST', requestPath`/users/${id}`);

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://api.getvero.com/api/v2/users/1234%2Fdelete%3Fx=1',
				}),
			}),
		);
	});
});
