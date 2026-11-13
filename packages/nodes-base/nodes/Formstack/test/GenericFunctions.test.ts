import { mockDeep } from 'vitest-mock-extended';
import type { IHookFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { apiRequest } from '../GenericFunctions';

describe('apiRequest', () => {
	it('should encode path values in the request URL', async () => {
		const context = mockDeep<IHookFunctions>();
		context.getNodeParameter.mockReturnValue('accessToken');
		context.getCredentials.mockResolvedValue({ accessToken: 'fake-token' });
		context.helpers.request.mockResolvedValue({ webhooks: [] });

		const formId = '5512345/webhook.json?x=1';
		await apiRequest.call(context, 'GET', requestPath`form/${formId}/webhook.json`);

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://www.formstack.com/api/v2/form/5512345%2Fwebhook.json%3Fx=1/webhook.json',
				}),
			}),
		);
	});
});
