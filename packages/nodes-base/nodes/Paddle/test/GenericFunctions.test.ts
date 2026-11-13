import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { paddleApiRequest } from '../GenericFunctions';

describe('paddleApiRequest', () => {
	it('should encode path values and join them with the sandbox URL', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({
			vendorId: '12345',
			vendorAuthCode: 'fake-auth-code',
			sandbox: true,
		});
		context.helpers.request.mockResolvedValue({ success: true });

		const value = 'plans/1?x=1';
		await paddleApiRequest.call(context, requestPath`/2.0/subscription/${value}`, 'POST');

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://sandbox-vendors.paddle.com/api/2.0/subscription/plans%2F1%3Fx=1',
				}),
			}),
		);
	});
});
