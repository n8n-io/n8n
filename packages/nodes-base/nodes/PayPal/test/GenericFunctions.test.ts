import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions, IRequestOptions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { payPalApiRequest } from '../GenericFunctions';

describe('payPalApiRequest', () => {
	it('should encode path values and join them with the environment base URL', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({
			clientId: 'fake-client-id',
			secret: 'fake-secret',
			env: 'sanbox',
		});
		context.helpers.request.mockResolvedValue({ access_token: 'fake-access-token' });

		const payoutItemId = '8AELMXH8UB2P8/cancel?x=1';
		await payPalApiRequest.call(
			context,
			requestPath`/payments/payouts-item/${payoutItemId}`,
			'GET',
		);

		expect(String((context.helpers.request.mock.calls[1][0] as IRequestOptions).uri)).toBe(
			'https://api-m.sandbox.paypal.com/v1/payments/payouts-item/8AELMXH8UB2P8%2Fcancel%3Fx=1',
		);
	});
});
