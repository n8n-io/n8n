import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';
import { mockDeep } from 'jest-mock-extended';

import { getresponseApiRequest } from '../GenericFunctions';

describe('getresponseApiRequest', () => {
	it('should encode a path value with a slash as one segment', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNodeParameter.mockReturnValue('apiKey');
		context.helpers.requestWithAuthentication.mockResolvedValue({});

		const id = '42/delete?x=1';
		await getresponseApiRequest.call(context, 'GET', requestPath`/contacts/${id}`);

		expect(context.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'getResponseApi',
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://api.getresponse.com/v3/contacts/42%2Fdelete%3Fx=1',
				}),
			}),
		);
	});
});
