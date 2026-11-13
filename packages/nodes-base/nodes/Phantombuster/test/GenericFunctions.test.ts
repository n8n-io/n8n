import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { phantombusterApiRequest } from '../GenericFunctions';

describe('phantombusterApiRequest', () => {
	it('should encode path values in the request URL', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.helpers.requestWithAuthentication.mockResolvedValue({});

		const value = 'fetch/1?x=1';
		await phantombusterApiRequest.call(context, 'GET', requestPath`/agents/${value}`);

		expect(context.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'phantombusterApi',
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://api.phantombuster.com/api/v2/agents/fetch%2F1%3Fx=1',
				}),
			}),
		);
	});
});
