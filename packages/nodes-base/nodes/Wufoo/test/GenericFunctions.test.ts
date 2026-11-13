import type { IHookFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { wufooApiRequest } from '../GenericFunctions';

describe('wufooApiRequest', () => {
	it('should encode path values and join them with the subdomain URL', async () => {
		const context = mockDeep<IHookFunctions>();
		context.getCredentials.mockResolvedValue({ subdomain: 'acme', apiKey: 'fake-api-key' });
		context.helpers.requestWithAuthentication.mockResolvedValue({});

		const formHash = 'z1x2/c3v4?x=1';
		await wufooApiRequest.call(context, 'DELETE', requestPath`forms/${formHash}/webhooks.json`);

		expect(context.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'wufooApi',
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://acme.wufoo.com/api/v3/forms/z1x2%2Fc3v4%3Fx=1/webhooks.json',
				}),
			}),
		);
	});
});
