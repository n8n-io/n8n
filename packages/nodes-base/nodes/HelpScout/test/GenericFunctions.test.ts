import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { helpscoutApiRequest } from '../GenericFunctions';

describe('helpscoutApiRequest', () => {
	it('should encode path values in the request URL', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.helpers.requestOAuth2.mockResolvedValue({});

		const conversationId = '1001/delete?x=1';
		await helpscoutApiRequest.call(
			context,
			'GET',
			requestPath`/v2/conversations/${conversationId}`,
		);

		expect(context.helpers.requestOAuth2).toHaveBeenCalledWith(
			'helpScoutOAuth2Api',
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://api.helpscout.net/v2/conversations/1001%2Fdelete%3Fx=1',
				}),
			}),
		);
	});
});
