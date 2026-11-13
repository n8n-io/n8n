import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';
import { mockDeep } from 'jest-mock-extended';

import { lonescaleApiRequest } from '../GenericFunctions';

describe('lonescaleApiRequest', () => {
	it('should encode path values', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({ apiKey: 'fake-api-key' });
		context.helpers.requestWithAuthentication.mockResolvedValue({});

		const listId = '68f1/delete?x=1';
		await lonescaleApiRequest.call(context, 'POST', requestPath`/lists/${listId}/item`, {
			first_name: 'Tim',
		});

		expect(context.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'loneScaleApi',
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://public-api.lonescale.com/lists/68f1%2Fdelete%3Fx=1/item',
				}),
			}),
		);
	});
});
