import type { IExecuteFunctions, IRequestOptions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';
import { mockDeep } from 'jest-mock-extended';

import { woocommerceApiRequest } from '../GenericFunctions';

describe('woocommerceApiRequest', () => {
	it('should encode a path value that contains a slash', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({ url: 'https://shop.example.com' });
		context.helpers.requestWithAuthentication.mockResolvedValue({});

		const orderId = '727/customers?x=1';
		await woocommerceApiRequest.call(context, 'GET', requestPath`/orders/${orderId}`);

		const options = context.helpers.requestWithAuthentication.mock.calls[0][1] as IRequestOptions;
		expect(String(options.uri)).toBe(
			'https://shop.example.com/wp-json/wc/v3/orders/727%2Fcustomers%3Fx=1',
		);
	});
});
