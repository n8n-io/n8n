import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { mindeeApiRequest } from '../GenericFunctions';

describe('mindeeApiRequest', () => {
	it('should encode path values', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNodeParameter.mockImplementation((name) => (name === 'apiVersion' ? 4 : 'invoice'));
		context.helpers.requestWithAuthentication.mockResolvedValue({});

		const product = 'invoices/v4?x=1';
		await mindeeApiRequest.call(context, 'POST', requestPath`/${product}/predict`);

		expect(context.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'mindeeInvoiceApi',
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://api.mindee.net/v1/products/mindee/invoices%2Fv4%3Fx=1/predict',
				}),
			}),
		);
	});
});
