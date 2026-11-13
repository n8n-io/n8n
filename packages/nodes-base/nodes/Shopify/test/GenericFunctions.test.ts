import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { shopifyApiRequest } from '../GenericFunctions';

describe('shopifyApiRequest', () => {
	it('should encode path values in the request URL', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNodeParameter.mockReturnValue('accessToken');
		context.getCredentials.mockResolvedValue({ shopSubdomain: 'acme-store' });
		context.helpers.requestWithAuthentication.mockResolvedValue({ order: {} });

		const orderId = '450789469/products?x=1';
		await shopifyApiRequest.call(context, 'GET', requestPath`/orders/${orderId}.json`);

		expect(context.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'shopifyAccessTokenApi',
			expect.objectContaining({
				uri: expect.objectContaining({
					value:
						'https://acme-store.myshopify.com/admin/api/2024-07//orders/450789469%2Fproducts%3Fx=1.json',
				}),
			}),
			expect.anything(),
		);
	});
});
