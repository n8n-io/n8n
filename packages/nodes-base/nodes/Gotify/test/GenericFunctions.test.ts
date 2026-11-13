import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';
import { mockDeep } from 'jest-mock-extended';

import { gotifyApiRequest } from '../GenericFunctions';

describe('gotifyApiRequest', () => {
	it('should encode path values', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({
			url: 'https://gotify.example.com',
			clientApiToken: 'test-client-token',
		});
		context.helpers.request.mockResolvedValue({});

		const messageId = '123/application';
		await gotifyApiRequest.call(context, 'DELETE', requestPath`/message/${messageId}`);

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://gotify.example.com/message/123%2Fapplication',
				}),
			}),
		);
	});
});
