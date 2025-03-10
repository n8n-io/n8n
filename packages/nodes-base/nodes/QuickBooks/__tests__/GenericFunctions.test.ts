import type { IExecuteFunctions } from 'n8n-workflow';

import { processLines } from '../GenericFunctions';
describe('processLines', () => {
	const mockExecuteFunctions: Partial<IExecuteFunctions> = {
		getNodeParameter: jest.fn(),
	};

	test('should process AccountBasedExpenseLineDetail for bill resource', () => {
		const lines = [{ DetailType: 'AccountBasedExpenseLineDetail', accountId: '123' }];

		const result = processLines.call(mockExecuteFunctions as IExecuteFunctions, lines, 'bill');

		expect(result).toEqual([
			{
				DetailType: 'AccountBasedExpenseLineDetail',
				AccountBasedExpenseLineDetail: { AccountRef: { value: '123' } },
			},
		]);
	});

	test('should process ItemBasedExpenseLineDetail for bill resource', () => {
		const lines = [{ DetailType: 'ItemBasedExpenseLineDetail', itemId: '456' }];

		const result = processLines.call(mockExecuteFunctions as IExecuteFunctions, lines, 'bill');

		expect(result).toEqual([
			{
				DetailType: 'ItemBasedExpenseLineDetail',
				ItemBasedExpenseLineDetail: { ItemRef: { value: '456' } },
			},
		]);
	});

	test('should process SalesItemLineDetail for estimate resource', () => {
		const lines = [{ DetailType: 'SalesItemLineDetail', itemId: '789', TaxCodeRef: 'TAX1' }];

		const result = processLines.call(mockExecuteFunctions as IExecuteFunctions, lines, 'estimate');

		expect(result).toEqual([
			{
				DetailType: 'SalesItemLineDetail',
				SalesItemLineDetail: { ItemRef: { value: '789' }, TaxCodeRef: { value: 'TAX1' } },
			},
		]);
	});

	test('should process SalesItemLineDetail for invoice resource with Qty', () => {
		const lines = [
			{ DetailType: 'SalesItemLineDetail', itemId: '101', TaxCodeRef: 'TAX2', Qty: 10 },
		];

		const result = processLines.call(mockExecuteFunctions as IExecuteFunctions, lines, 'invoice');

		expect(result).toEqual([
			{
				DetailType: 'SalesItemLineDetail',
				SalesItemLineDetail: { ItemRef: { value: '101' }, TaxCodeRef: { value: 'TAX2' }, Qty: 10 },
			},
		]);
	});

	test('should process SalesItemLineDetail for invoice resource without Qty', () => {
		const lines = [{ DetailType: 'SalesItemLineDetail', itemId: '202', TaxCodeRef: 'TAX3' }];

		const result = processLines.call(mockExecuteFunctions as IExecuteFunctions, lines, 'invoice');

		expect(result).toEqual([
			{
				DetailType: 'SalesItemLineDetail',
				SalesItemLineDetail: { ItemRef: { value: '202' }, TaxCodeRef: { value: 'TAX3' } },
			},
		]);
	});
});
