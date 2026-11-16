import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { apiRequest } from '../GenericFunctions';

describe('apiRequest', () => {
	it('should encode path values', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNodeParameter.mockReturnValue('apiKey');
		context.helpers.requestWithAuthentication.mockResolvedValue({});

		const id = '60a1b2/delete?x=1';
		await apiRequest.call(context, 'GET', requestPath`cards/${id}`, {});

		expect(context.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'trelloApi',
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://api.trello.com/1/cards/60a1b2%2Fdelete%3Fx=1',
				}),
			}),
		);
	});
});
