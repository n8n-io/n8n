import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { ghostApiRequest } from '../GenericFunctions';

describe('ghostApiRequest', () => {
	it('should encode a path value with a slash as one segment', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNodeParameter.mockReturnValue('contentApi');
		context.getCredentials.mockResolvedValue({
			url: 'https://blog.example.com/',
			apiKey: 'fake-key',
		});
		context.helpers.requestWithAuthentication.mockResolvedValue({});

		const id = '42/delete?x=1';
		await ghostApiRequest.call(context, 'GET', requestPath`/content/posts/${id}`);

		expect(context.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'ghostContentApi',
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://blog.example.com/ghost/api/v3/content/posts/42%2Fdelete%3Fx=1',
				}),
			}),
		);
	});
});
