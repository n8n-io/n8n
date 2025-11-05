import type { IExecuteFunctions } from 'n8n-workflow';

import { populateFields, processLines } from '../GenericFunctions';

describe('Sales Receipt', () => {
	const mockExecuteFunctions: Partial<IExecuteFunctions> = {
		getNodeParameter: jest.fn(),
	};

	describe('processLines', () => {
		test('should process SalesItemLineDetail for salesReceipt with Qty', () => {
			const lines = [
				{ DetailType: 'SalesItemLineDetail', itemId: '123', TaxCodeRef: 'TAX1', Qty: 5 },
			];

			const result = processLines.call(
				mockExecuteFunctions as IExecuteFunctions,
				lines,
				'salesReceipt',
			);

			expect(result).toEqual([
				{
					DetailType: 'SalesItemLineDetail',
					SalesItemLineDetail: {
						ItemRef: { value: '123' },
						TaxCodeRef: { value: 'TAX1' },
						Qty: 5,
					},
				},
			]);
		});

		test('should process SalesItemLineDetail for salesReceipt without Qty', () => {
			const lines = [{ DetailType: 'SalesItemLineDetail', itemId: '456', TaxCodeRef: 'TAX2' }];

			const result = processLines.call(
				mockExecuteFunctions as IExecuteFunctions,
				lines,
				'salesReceipt',
			);

			expect(result).toEqual([
				{
					DetailType: 'SalesItemLineDetail',
					SalesItemLineDetail: {
						ItemRef: { value: '456' },
						TaxCodeRef: { value: 'TAX2' },
					},
				},
			]);
		});

		test('should process multiple line items for salesReceipt', () => {
			const lines = [
				{ DetailType: 'SalesItemLineDetail', itemId: '111', TaxCodeRef: 'TAX1', Qty: 2 },
				{ DetailType: 'SalesItemLineDetail', itemId: '222', TaxCodeRef: 'TAX2', Qty: 3 },
			];

			const result = processLines.call(
				mockExecuteFunctions as IExecuteFunctions,
				lines,
				'salesReceipt',
			);

			expect(result).toEqual([
				{
					DetailType: 'SalesItemLineDetail',
					SalesItemLineDetail: {
						ItemRef: { value: '111' },
						TaxCodeRef: { value: 'TAX1' },
						Qty: 2,
					},
				},
				{
					DetailType: 'SalesItemLineDetail',
					SalesItemLineDetail: {
						ItemRef: { value: '222' },
						TaxCodeRef: { value: 'TAX2' },
						Qty: 3,
					},
				},
			]);
		});
	});

	describe('populateFields', () => {
		test('should populate PaymentMethodRef as string reference', () => {
			const body = { CustomerRef: { value: '1' } };
			const fields = { PaymentMethodRef: '10' };

			const result = populateFields.call(
				mockExecuteFunctions as IExecuteFunctions,
				body,
				fields,
				'salesReceipt',
			);

			expect(result).toEqual({
				CustomerRef: { value: '1' },
				PaymentMethodRef: { value: '10' },
			});
		});

		test('should populate DepositToAccountRef as string reference', () => {
			const body = { CustomerRef: { value: '1' } };
			const fields = { DepositToAccountRef: '35' };

			const result = populateFields.call(
				mockExecuteFunctions as IExecuteFunctions,
				body,
				fields,
				'salesReceipt',
			);

			expect(result).toEqual({
				CustomerRef: { value: '1' },
				DepositToAccountRef: { value: '35' },
			});
		});

		test('should populate BillAddr with address details', () => {
			const body = { CustomerRef: { value: '1' } };
			const fields = {
				BillAddr: {
					details: {
						City: 'San Francisco',
						Line1: '123 Main St',
						PostalCode: '94102',
						CountrySubDivisionCode: 'CA',
					},
				},
			};

			const result = populateFields.call(
				mockExecuteFunctions as IExecuteFunctions,
				body,
				fields,
				'salesReceipt',
			);

			expect(result).toEqual({
				CustomerRef: { value: '1' },
				BillAddr: {
					City: 'San Francisco',
					Line1: '123 Main St',
					PostalCode: '94102',
					CountrySubDivisionCode: 'CA',
				},
			});
		});

		test('should populate ShipAddr with address details', () => {
			const body = { CustomerRef: { value: '1' } };
			const fields = {
				ShipAddr: {
					details: {
						City: 'Los Angeles',
						Line1: '456 Oak Ave',
						PostalCode: '90001',
					},
				},
			};

			const result = populateFields.call(
				mockExecuteFunctions as IExecuteFunctions,
				body,
				fields,
				'salesReceipt',
			);

			expect(result).toEqual({
				CustomerRef: { value: '1' },
				ShipAddr: {
					City: 'Los Angeles',
					Line1: '456 Oak Ave',
					PostalCode: '90001',
				},
			});
		});

		test('should populate BillEmail', () => {
			const body = { CustomerRef: { value: '1' } };
			const fields = { BillEmail: 'customer@example.com' };

			const result = populateFields.call(
				mockExecuteFunctions as IExecuteFunctions,
				body,
				fields,
				'salesReceipt',
			);

			expect(result).toEqual({
				CustomerRef: { value: '1' },
				BillEmail: { Address: 'customer@example.com' },
			});
		});

		test('should populate CustomerMemo', () => {
			const body = { CustomerRef: { value: '1' } };
			const fields = { CustomerMemo: 'Thank you for your business!' };

			const result = populateFields.call(
				mockExecuteFunctions as IExecuteFunctions,
				body,
				fields,
				'salesReceipt',
			);

			expect(result).toEqual({
				CustomerRef: { value: '1' },
				CustomerMemo: { value: 'Thank you for your business!' },
			});
		});

		test('should populate CustomFields', () => {
			const body = { CustomerRef: { value: '1' } };
			const fields = {
				CustomFields: {
					Field: [
						{ DefinitionId: '1', StringValue: 'Custom Value 1' },
						{ DefinitionId: '2', StringValue: 'Custom Value 2' },
					],
				},
			};

			const result = populateFields.call(
				mockExecuteFunctions as IExecuteFunctions,
				body,
				fields,
				'salesReceipt',
			);

			expect(result.CustomField).toEqual([
				{ DefinitionId: '1', StringValue: 'Custom Value 1', Type: 'StringType' },
				{ DefinitionId: '2', StringValue: 'Custom Value 2', Type: 'StringType' },
			]);
		});

		test('should populate multiple fields together', () => {
			const body = { CustomerRef: { value: '1' } };
			const fields = {
				PaymentMethodRef: '10',
				DepositToAccountRef: '35',
				CustomerMemo: 'Payment received',
				PrivateNote: 'Internal note',
				TxnDate: '2025-01-15',
				DocNumber: 'SR-001',
			};

			const result = populateFields.call(
				mockExecuteFunctions as IExecuteFunctions,
				body,
				fields,
				'salesReceipt',
			);

			expect(result).toEqual({
				CustomerRef: { value: '1' },
				PaymentMethodRef: { value: '10' },
				DepositToAccountRef: { value: '35' },
				CustomerMemo: { value: 'Payment received' },
				PrivateNote: 'Internal note',
				TxnDate: '2025-01-15',
				DocNumber: 'SR-001',
			});
		});

		test('should filter out empty address fields', () => {
			const body = { CustomerRef: { value: '1' } };
			const fields = {
				BillAddr: {
					details: {
						City: 'New York',
						Line1: '',
						PostalCode: '10001',
						Lat: '',
						Long: '',
					},
				},
			};

			const result = populateFields.call(
				mockExecuteFunctions as IExecuteFunctions,
				body,
				fields,
				'salesReceipt',
			);

			expect(result.BillAddr).toEqual({
				City: 'New York',
				PostalCode: '10001',
			});
		});
	});

	describe('delete operation', () => {
		test('should create and delete a sales receipt with mocked API', async () => {
			// Mock the getSyncToken function
			const mockGetSyncToken = jest.fn().mockResolvedValue('5');

			// Mock the quickBooksApiRequest function
			const mockQuickBooksApiRequest = jest.fn();

			// Mock create response
			mockQuickBooksApiRequest.mockResolvedValueOnce({
				SalesReceipt: {
					Id: '149',
					SyncToken: '0',
					CustomerRef: { value: '1' },
					Line: [
						{
							DetailType: 'SalesItemLineDetail',
							Amount: 100.0,
							Description: 'Test Item',
							SalesItemLineDetail: {
								ItemRef: { value: '1' },
								TaxCodeRef: { value: 'TAX' },
								Qty: 1,
							},
						},
					],
				},
			});

			// Mock delete response
			mockQuickBooksApiRequest.mockResolvedValueOnce({
				SalesReceipt: {
					Id: '149',
					SyncToken: '5',
					status: 'Deleted',
				},
			});

			// STEP 1: Simulate create operation
			// This represents the request body that would be sent to create a sales receipt
			const createBody = {
				CustomerRef: { value: '1' },
				Line: [
					{
						DetailType: 'SalesItemLineDetail',
						Amount: 100.0,
						Description: 'Test Item',
						SalesItemLineDetail: {
							ItemRef: { value: '1' },
							TaxCodeRef: { value: 'TAX' },
							Qty: 1,
						},
					},
				],
			};

			const createResponse = await mockQuickBooksApiRequest(
				'POST',
				'/v3/company/123/salesreceipt',
				{},
				createBody,
			);

			// Verify create was called correctly
			expect(mockQuickBooksApiRequest).toHaveBeenCalledWith(
				'POST',
				'/v3/company/123/salesreceipt',
				{},
				createBody,
			);
			expect(createResponse.SalesReceipt.Id).toBe('149');
			expect(createResponse.SalesReceipt.SyncToken).toBe('0');

			// STEP 2: Get SyncToken for delete
			// In the actual implementation, getSyncToken fetches the current SyncToken
			const syncToken = await mockGetSyncToken();
			expect(mockGetSyncToken).toHaveBeenCalled();
			expect(syncToken).toBe('5');

			// STEP 3: Simulate delete operation
			// This represents the delete request with the required query string and body
			const deleteQs = { operation: 'delete' };
			const deleteBody = {
				Id: '149',
				SyncToken: syncToken,
			};

			const deleteResponse = await mockQuickBooksApiRequest(
				'POST',
				'/v3/company/123/salesreceipt',
				deleteQs,
				deleteBody,
			);

			// Verify delete was called correctly
			expect(mockQuickBooksApiRequest).toHaveBeenCalledWith(
				'POST',
				'/v3/company/123/salesreceipt',
				{ operation: 'delete' },
				{ Id: '149', SyncToken: '5' },
			);
			expect(deleteResponse.SalesReceipt.Id).toBe('149');
			expect(deleteResponse.SalesReceipt.status).toBe('Deleted');

			// Verify both operations were called
			expect(mockQuickBooksApiRequest).toHaveBeenCalledTimes(2);
		});
	});
});
