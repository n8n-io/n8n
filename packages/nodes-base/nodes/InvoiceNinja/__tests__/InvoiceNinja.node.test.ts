import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { invoiceNinjaApiRequestAllItems } from '../GenericFunctions';
import * as GenericFunctions from '../GenericFunctions';
import { InvoiceNinja } from '../InvoiceNinja.node';

describe('InvoiceNinja Node - getCurrencies', () => {
	const mockContext = {} as unknown as ILoadOptionsFunctions;
	let invoiceNinjaNode: InvoiceNinja;
	let mockExecutionContext: any;

	beforeEach(() => {
		invoiceNinjaNode = new InvoiceNinja();
		mockExecutionContext = {
			getNode: jest.fn().mockReturnValue({ name: 'InvoiceNinja' }),
			getNodeParameter: jest.fn(),
			getInputData: jest.fn().mockReturnValue([{ json: {} }]),
			continueOnFail: jest.fn().mockReturnValue(false),
			getCredentials: jest.fn().mockResolvedValue({
				server: 'https://app.invoiceninja.com',
			}),
			helpers: {
				returnJsonArray: jest.fn().mockReturnValue([{ json: {} }]),
				requestWithAuthentication: jest.fn().mockResolvedValue({}),
				constructExecutionMetaData: jest.fn().mockReturnValue([{ json: {} }]),
			},
		};
	});

	it('should return formatted currencies', async () => {
		const spy = jest.spyOn(GenericFunctions, 'invoiceNinjaApiRequestAllItems').mockResolvedValue([
			{ id: '1', code: 'USD' },
			{ id: '2', code: 'EUR' },
		]);

		const result = await invoiceNinjaNode.methods.loadOptions.getCurrencies.call(mockContext);

		expect(result).toEqual([
			{ name: '1 - USD', value: '1' },
			{ name: '2 - EUR', value: '2' },
		]);

		expect(invoiceNinjaApiRequestAllItems).toHaveBeenCalledWith('currencies', 'GET', '/statics');

		spy.mockRestore();
	});
});
