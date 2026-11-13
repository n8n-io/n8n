import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { mediumApiRequest } from '../GenericFunctions';

describe('mediumApiRequest', () => {
	it('should encode path values', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNodeParameter.mockReturnValue('accessToken');
		context.getCredentials.mockResolvedValue({ accessToken: 'fake-access-token' });
		context.helpers.request.mockResolvedValue({});

		const publicationId = '5e3b1c9a2f4d/posts?x=1';
		await mediumApiRequest.call(context, 'POST', requestPath`/publications/${publicationId}/posts`);

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://api.medium.com/v1/publications/5e3b1c9a2f4d%2Fposts%3Fx=1/posts',
				}),
			}),
		);
	});
});
