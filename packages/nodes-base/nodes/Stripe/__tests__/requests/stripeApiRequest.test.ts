import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { stripeApiRequest } from '../../helpers';

describe('stripeApiRequest', () => {
	it('should encode a path value as one segment', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.helpers.requestWithAuthentication.mockResolvedValue({});

		const chargeId = 'ch_1/refunds?x=1';
		await stripeApiRequest.call(context, 'GET', requestPath`/charges/${chargeId}`, {});

		expect(context.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'stripeApi',
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://api.stripe.com/v1/charges/ch_1%2Frefunds%3Fx=1',
				}),
			}),
		);
	});
});
