import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { messageBirdApiRequest } from '../GenericFunctions';

describe('messageBirdApiRequest', () => {
	it('should encode path values', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({ accessKey: 'fake-access-key' });
		context.helpers.request.mockResolvedValue({});

		const messageId = 'e8077d80/balance?x=1';
		await messageBirdApiRequest.call(context, 'GET', requestPath`/messages/${messageId}`, {});

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://rest.messagebird.com/messages/e8077d80%2Fbalance%3Fx=1',
				}),
			}),
		);
	});
});
