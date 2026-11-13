import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { xeroApiRequest } from '../GenericFunctions';

describe('xeroApiRequest', () => {
	it('should encode path values and join them with the Xero API URL', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.helpers.requestOAuth2.mockResolvedValue({});

		const invoiceId = 'INV/0042?x=1';
		await xeroApiRequest.call(context, 'GET', requestPath`/Invoices/${invoiceId}`);

		expect(context.helpers.requestOAuth2).toHaveBeenCalledWith(
			'xeroOAuth2Api',
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://api.xero.com/api.xro/2.0/Invoices/INV%2F0042%3Fx=1',
				}),
			}),
		);
	});
});
