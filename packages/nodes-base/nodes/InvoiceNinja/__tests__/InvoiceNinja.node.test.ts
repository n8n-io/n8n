import type { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { InvoiceNinja } from '../InvoiceNinja.node';

describe('InvoiceNinja Node', () => {
	const node = new InvoiceNinja();

	it('should load currencies from the statics endpoint', async () => {
		const context = mockDeep<ILoadOptionsFunctions>();
		context.getCredentials.mockResolvedValue({ url: 'https://invoicing.co' });
		context.getNodeParameter.mockReturnValue('v5');
		context.helpers.requestWithAuthentication.mockResolvedValue({
			currencies: [
				{ id: 1, code: 'USD', name: 'US Dollar' },
				{ id: 2, code: 'EUR', name: 'Euro' },
			],
		});

		const result = await node.methods.loadOptions.getCurrencies.call(context);

		expect(result).toEqual([
			{ name: 'US Dollar (USD)', value: 1 },
			{ name: 'Euro (EUR)', value: 2 },
		]);
		expect(context.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'invoiceNinjaApi',
			expect.objectContaining({ method: 'GET', uri: 'https://invoicing.co/api/v1/statics' }),
		);
	});

	it('should send date and description when creating a bank transaction', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getInputData.mockReturnValue([{ json: {} }]);
		context.getCredentials.mockResolvedValue({ url: 'https://invoicing.co' });
		context.getNodeParameter.mockImplementation((name: string) => {
			const params: Record<string, unknown> = {
				apiVersion: 'v5',
				resource: 'bank_transaction',
				operation: 'create',
				additionalFields: { date: '2025-01-01', description: 'Coffee' },
			};
			return params[name] as never;
		});
		context.helpers.requestWithAuthentication.mockResolvedValue({ data: {} });
		context.helpers.returnJsonArray.mockReturnValue([]);
		context.helpers.constructExecutionMetaData.mockReturnValue([]);

		await node.execute.call(context);

		expect(context.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'invoiceNinjaApi',
			expect.objectContaining({ body: { date: '2025-01-01', description: 'Coffee' } }),
		);
	});
});
