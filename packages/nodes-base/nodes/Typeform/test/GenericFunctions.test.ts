import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { apiRequest } from '../GenericFunctions';

describe('apiRequest', () => {
	it('should encode path values', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNodeParameter.mockReturnValue('accessToken');
		context.helpers.requestWithAuthentication.mockResolvedValue({});

		const formId = 'aBcD12/webhooks?x=1';
		await apiRequest.call(context, 'GET', requestPath`forms/${formId}/webhooks`, {});

		expect(context.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'typeformApi',
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://api.typeform.com/forms/aBcD12%2Fwebhooks%3Fx=1/webhooks',
				}),
			}),
		);
	});
});
