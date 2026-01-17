import { mock, mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { InvoiceNinja } from '../InvoiceNinja.node';
import * as GenericFunctions from '../GenericFunctions';

describe('InvoiceNinja Node', () => {
	let invoiceNinjaNode: InvoiceNinja;
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	const invoiceNinjaApiRequestSpy = jest.spyOn(GenericFunctions, 'invoiceNinjaApiRequest');

	beforeEach(() => {
		invoiceNinjaNode = new InvoiceNinja();
		mockExecuteFunctions = mockDeep<IExecuteFunctions>({
			helpers: {
				constructExecutionMetaData: jest.fn().mockImplementation((data) => data),
				returnJsonArray: jest
					.fn()
					.mockImplementation((data) =>
						Array.isArray(data) ? data.map((item) => ({ json: item })) : [{ json: data }],
					),
				prepareBinaryData: jest.fn().mockResolvedValue({
					data: Buffer.from('mock-pdf-data').toString('base64'),
					mimeType: 'application/pdf',
					fileName: 'invoice_test123.pdf',
				}),
				requestWithAuthentication: jest.fn(),
			},
		});
		jest.clearAllMocks();

		mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
		mockExecuteFunctions.getNode.mockReturnValue(
			mock<INode>({
				id: 'test-invoiceninja-node',
				name: 'InvoiceNinja Test',
				type: 'n8n-nodes-base.invoiceNinja',
				typeVersion: 2,
				position: [0, 0],
				parameters: {},
			}),
		);
		mockExecuteFunctions.continueOnFail.mockReturnValue(false);
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	describe('Invoice Resource - Email Operation', () => {
		describe('API v4', () => {
			it('should send email using v4 endpoint', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					const params: { [key: string]: any } = {
						resource: 'invoice',
						operation: 'email',
						apiVersion: 'v4',
						invoiceId: 'inv_123',
					};
					return params[paramName];
				});

				invoiceNinjaApiRequestSpy.mockResolvedValue({ data: { success: true } });

				const result = await invoiceNinjaNode.execute.call(mockExecuteFunctions);

				expect(invoiceNinjaApiRequestSpy).toHaveBeenCalledWith('POST', '/email_invoice', {
					id: 'inv_123',
				});
				expect(result).toHaveLength(1);
			});
		});

		describe('API v5', () => {
			it('should send email using v5 /emails endpoint', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					const params: { [key: string]: any } = {
						resource: 'invoice',
						operation: 'email',
						apiVersion: 'v5',
						invoiceId: 'inv_456',
					};
					return params[paramName];
				});

				invoiceNinjaApiRequestSpy.mockResolvedValue({ data: { success: true } });

				const result = await invoiceNinjaNode.execute.call(mockExecuteFunctions);

				expect(invoiceNinjaApiRequestSpy).toHaveBeenCalledWith('POST', '/emails', {
					template: 'email_template_invoice',
					entity: 'invoice',
					entity_id: 'inv_456',
				});
				expect(result).toHaveLength(1);
			});
		});
	});

	describe('Invoice Resource - Archive Operation', () => {
		describe('API v4', () => {
			it('should archive invoice using v4 PUT endpoint', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					const params: { [key: string]: any } = {
						resource: 'invoice',
						operation: 'archive',
						apiVersion: 'v4',
						invoiceId: 'inv_789',
					};
					return params[paramName];
				});

				invoiceNinjaApiRequestSpy.mockResolvedValue({ data: { archived: true, id: 'inv_789' } });

				const result = await invoiceNinjaNode.execute.call(mockExecuteFunctions);

				expect(invoiceNinjaApiRequestSpy).toHaveBeenCalledWith('PUT', '/invoices/inv_789', {
					archived: true,
				});
				expect(result).toHaveLength(1);
			});
		});

		describe('API v5', () => {
			it('should archive invoice using v5 bulk action', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					const params: { [key: string]: any } = {
						resource: 'invoice',
						operation: 'archive',
						apiVersion: 'v5',
						invoiceId: 'inv_101',
					};
					return params[paramName];
				});

				invoiceNinjaApiRequestSpy.mockResolvedValue({
					data: [{ archived: true, id: 'inv_101' }],
				});

				const result = await invoiceNinjaNode.execute.call(mockExecuteFunctions);

				expect(invoiceNinjaApiRequestSpy).toHaveBeenCalledWith('POST', '/invoices/bulk', {
					action: 'archive',
					ids: ['inv_101'],
				});
				expect(result).toHaveLength(1);
			});
		});
	});

	describe('Invoice Resource - Mark Sent Operation', () => {
		describe('API v4', () => {
			it('should mark invoice as sent using v4 status update', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					const params: { [key: string]: any } = {
						resource: 'invoice',
						operation: 'markSent',
						apiVersion: 'v4',
						invoiceId: 'inv_202',
					};
					return params[paramName];
				});

				invoiceNinjaApiRequestSpy.mockResolvedValue({
					data: { invoice_status_id: 2, id: 'inv_202' },
				});

				const result = await invoiceNinjaNode.execute.call(mockExecuteFunctions);

				expect(invoiceNinjaApiRequestSpy).toHaveBeenCalledWith('PUT', '/invoices/inv_202', {
					invoice_status_id: 2,
				});
				expect(result).toHaveLength(1);
			});
		});

		describe('API v5', () => {
			it('should mark invoice as sent using v5 bulk action', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					const params: { [key: string]: any } = {
						resource: 'invoice',
						operation: 'markSent',
						apiVersion: 'v5',
						invoiceId: 'inv_303',
					};
					return params[paramName];
				});

				invoiceNinjaApiRequestSpy.mockResolvedValue({
					data: [{ status_id: 2, id: 'inv_303' }],
				});

				const result = await invoiceNinjaNode.execute.call(mockExecuteFunctions);

				expect(invoiceNinjaApiRequestSpy).toHaveBeenCalledWith('POST', '/invoices/bulk', {
					action: 'mark_sent',
					ids: ['inv_303'],
				});
				expect(result).toHaveLength(1);
			});
		});
	});

	describe('Invoice Resource - Mark Paid Operation', () => {
		it('should throw error for v4 API (not supported)', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: { [key: string]: any } = {
					resource: 'invoice',
					operation: 'markPaid',
					apiVersion: 'v4',
					invoiceId: 'inv_404',
				};
				return params[paramName];
			});

			await expect(invoiceNinjaNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
				'Mark Paid operation is only supported in API v5',
			);
		});

		it('should mark invoice as paid using v5 bulk action', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: { [key: string]: any } = {
					resource: 'invoice',
					operation: 'markPaid',
					apiVersion: 'v5',
					invoiceId: 'inv_505',
				};
				return params[paramName];
			});

			invoiceNinjaApiRequestSpy.mockResolvedValue({
				data: [{ status_id: 4, id: 'inv_505' }],
			});

			const result = await invoiceNinjaNode.execute.call(mockExecuteFunctions);

			expect(invoiceNinjaApiRequestSpy).toHaveBeenCalledWith('POST', '/invoices/bulk', {
				action: 'mark_paid',
				ids: ['inv_505'],
			});
			expect(result).toHaveLength(1);
		});
	});

	describe('Invoice Resource - Download Operation', () => {
		it('should throw error for v4 API (not supported)', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: { [key: string]: any } = {
					resource: 'invoice',
					operation: 'download',
					apiVersion: 'v4',
					invoiceId: 'inv_606',
					binaryProperty: 'data',
				};
				return params[paramName];
			});

			await expect(invoiceNinjaNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
				'Download operation is only supported in API v5',
			);
		});

		it('should download invoice PDF for v5 API', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: { [key: string]: any } = {
					resource: 'invoice',
					operation: 'download',
					apiVersion: 'v5',
					invoiceId: 'inv_707',
					binaryProperty: 'data',
				};
				return params[paramName];
			});

			mockExecuteFunctions.getCredentials.mockResolvedValue({
				url: 'https://myinvoicing.com',
				apiKey: 'test_key',
			});

			const mockPdfBuffer = Buffer.from('mock-pdf-content');
			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				mockPdfBuffer,
			);

			const result = await invoiceNinjaNode.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'invoiceNinjaApi',
				{
					method: 'GET',
					uri: 'https://myinvoicing.com/api/v1/invoices/inv_707/download',
					encoding: null,
					json: false,
				},
			);
			expect(mockExecuteFunctions.helpers.prepareBinaryData).toHaveBeenCalledWith(
				mockPdfBuffer,
				'invoice_inv_707.pdf',
				'application/pdf',
			);
			expect(result).toHaveLength(1);
		});

		it('should download PDF with custom binary property name', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: { [key: string]: any } = {
					resource: 'invoice',
					operation: 'download',
					apiVersion: 'v5',
					invoiceId: 'inv_808',
					binaryProperty: 'customProp',
				};
				return params[paramName];
			});

			mockExecuteFunctions.getCredentials.mockResolvedValue({
				url: 'https://test.invoicing.co',
				apiKey: 'test_key',
			});

			const mockPdfBuffer = Buffer.from('pdf-data-here');
			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				mockPdfBuffer,
			);

			const result = await invoiceNinjaNode.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.prepareBinaryData).toHaveBeenCalledWith(
				mockPdfBuffer,
				'invoice_inv_808.pdf',
				'application/pdf',
			);
			expect(result).toHaveLength(1);
		});

		it('should use default URL if credentials.url not provided', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: { [key: string]: any } = {
					resource: 'invoice',
					operation: 'download',
					apiVersion: 'v5',
					invoiceId: 'inv_909',
					binaryProperty: 'data',
				};
				return params[paramName];
			});

			mockExecuteFunctions.getCredentials.mockResolvedValue({
				apiKey: 'test_key',
			});

			const mockPdfBuffer = Buffer.from('pdf-content');
			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				mockPdfBuffer,
			);

			await invoiceNinjaNode.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'invoiceNinjaApi',
				{
					method: 'GET',
					uri: 'https://invoicing.co/api/v1/invoices/inv_909/download',
					encoding: null,
					json: false,
				},
			);
		});

		it('should throw error if PDF data is not a Buffer', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: { [key: string]: any } = {
					resource: 'invoice',
					operation: 'download',
					apiVersion: 'v5',
					invoiceId: 'inv_error',
					binaryProperty: 'data',
				};
				return params[paramName];
			});

			mockExecuteFunctions.getCredentials.mockResolvedValue({
				url: 'https://test.com',
				apiKey: 'test_key',
			});

			// Mock returning non-Buffer data
			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				'not-a-buffer',
			);

			await expect(invoiceNinjaNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
				'Expected PDF data to be a Buffer',
			);
		});
	});

	describe('Quote Resource - Email Operation', () => {
		describe('API v4', () => {
			it('should send quote email using v4 endpoint', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					const params: { [key: string]: any } = {
						resource: 'quote',
						operation: 'email',
						apiVersion: 'v4',
						quoteId: 'quote_123',
					};
					return params[paramName];
				});

				invoiceNinjaApiRequestSpy.mockResolvedValue({ data: { success: true } });

				const result = await invoiceNinjaNode.execute.call(mockExecuteFunctions);

				expect(invoiceNinjaApiRequestSpy).toHaveBeenCalledWith('POST', '/email_invoice', {
					id: 'quote_123',
				});
				expect(result).toHaveLength(1);
			});
		});

		describe('API v5', () => {
			it('should send quote email using v5 /emails endpoint', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					const params: { [key: string]: any } = {
						resource: 'quote',
						operation: 'email',
						apiVersion: 'v5',
						quoteId: 'quote_456',
					};
					return params[paramName];
				});

				invoiceNinjaApiRequestSpy.mockResolvedValue({ data: { success: true } });

				const result = await invoiceNinjaNode.execute.call(mockExecuteFunctions);

				expect(invoiceNinjaApiRequestSpy).toHaveBeenCalledWith('POST', '/emails', {
					template: 'email_template_quote',
					entity: 'quote',
					entity_id: 'quote_456',
				});
				expect(result).toHaveLength(1);
			});
		});
	});

	describe('Multiple Items Processing', () => {
		it('should handle multiple invoices with archive operation', async () => {
			mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }, { json: {} }]);

			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(paramName: string, index: number) => {
					if (paramName === 'resource') return 'invoice';
					if (paramName === 'operation') return 'archive';
					if (paramName === 'apiVersion') return 'v5';
					if (paramName === 'invoiceId') {
						return index === 0 ? 'inv_multi_1' : 'inv_multi_2';
					}
					return undefined;
				},
			);

			invoiceNinjaApiRequestSpy
				.mockResolvedValueOnce({ data: [{ archived: true, id: 'inv_multi_1' }] })
				.mockResolvedValueOnce({ data: [{ archived: true, id: 'inv_multi_2' }] });

			const result = await invoiceNinjaNode.execute.call(mockExecuteFunctions);

			expect(invoiceNinjaApiRequestSpy).toHaveBeenCalledTimes(2);
			expect(invoiceNinjaApiRequestSpy).toHaveBeenNthCalledWith(1, 'POST', '/invoices/bulk', {
				action: 'archive',
				ids: ['inv_multi_1'],
			});
			expect(invoiceNinjaApiRequestSpy).toHaveBeenNthCalledWith(2, 'POST', '/invoices/bulk', {
				action: 'archive',
				ids: ['inv_multi_2'],
			});
			expect(result[0]).toHaveLength(2);
		});
	});

	describe('Error Handling', () => {
		it('should handle API errors gracefully when continueOnFail is true', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: { [key: string]: any } = {
					resource: 'invoice',
					operation: 'archive',
					apiVersion: 'v5',
					invoiceId: 'inv_error',
				};
				return params[paramName];
			});

			mockExecuteFunctions.continueOnFail.mockReturnValue(true);
			invoiceNinjaApiRequestSpy.mockRejectedValue(new Error('Invoice not found'));

			const result = await invoiceNinjaNode.execute.call(mockExecuteFunctions);

			expect(result).toHaveLength(1);
			expect(result[0][0].json).toHaveProperty('error', 'Invoice not found');
		});

		it('should throw error when continueOnFail is false', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: { [key: string]: any } = {
					resource: 'invoice',
					operation: 'markPaid',
					apiVersion: 'v5',
					invoiceId: 'inv_fail',
				};
				return params[paramName];
			});

			mockExecuteFunctions.continueOnFail.mockReturnValue(false);
			invoiceNinjaApiRequestSpy.mockRejectedValue(new Error('API Error'));

			await expect(invoiceNinjaNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
				'API Error',
			);
		});
	});

	describe('API Version Compatibility', () => {
		it('should correctly handle operations across both API versions', async () => {
			const operations = [
				{
					operation: 'email',
					v4Endpoint: '/email_invoice',
					v5Endpoint: '/emails',
					invoiceId: 'test_001',
				},
				{
					operation: 'archive',
					v4Endpoint: '/invoices/test_002',
					v5Endpoint: '/invoices/bulk',
					invoiceId: 'test_002',
				},
				{
					operation: 'markSent',
					v4Endpoint: '/invoices/test_003',
					v5Endpoint: '/invoices/bulk',
					invoiceId: 'test_003',
				},
			];

			for (const op of operations) {
				// Test v4
				jest.clearAllMocks();
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					const params: { [key: string]: any } = {
						resource: 'invoice',
						operation: op.operation,
						apiVersion: 'v4',
						invoiceId: op.invoiceId,
					};
					return params[paramName];
				});

				invoiceNinjaApiRequestSpy.mockResolvedValue({ data: { success: true } });

				await invoiceNinjaNode.execute.call(mockExecuteFunctions);

				if (op.operation === 'email') {
					expect(invoiceNinjaApiRequestSpy).toHaveBeenCalledWith(
						'POST',
						op.v4Endpoint,
						expect.any(Object),
					);
				} else {
					expect(invoiceNinjaApiRequestSpy).toHaveBeenCalledWith(
						'PUT',
						op.v4Endpoint,
						expect.any(Object),
					);
				}

				// Test v5
				jest.clearAllMocks();
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					const params: { [key: string]: any } = {
						resource: 'invoice',
						operation: op.operation,
						apiVersion: 'v5',
						invoiceId: op.invoiceId,
					};
					return params[paramName];
				});

				invoiceNinjaApiRequestSpy.mockResolvedValue({ data: { success: true } });

				await invoiceNinjaNode.execute.call(mockExecuteFunctions);

				expect(invoiceNinjaApiRequestSpy).toHaveBeenCalledWith(
					'POST',
					op.v5Endpoint,
					expect.any(Object),
				);
			}
		});
	});

	describe('Response Data Handling', () => {
		it('should handle responseData.data or responseData fallback', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: { [key: string]: any } = {
					resource: 'invoice',
					operation: 'archive',
					apiVersion: 'v5',
					invoiceId: 'inv_fallback',
				};
				return params[paramName];
			});

			// Test with data property
			invoiceNinjaApiRequestSpy.mockResolvedValue({
				data: { archived: true, id: 'inv_fallback' },
			});

			let result = await invoiceNinjaNode.execute.call(mockExecuteFunctions);
			expect(result).toHaveLength(1);

			// Test without data property (direct response)
			jest.clearAllMocks();
			mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
			invoiceNinjaApiRequestSpy.mockResolvedValue({ archived: true, id: 'inv_direct' });

			result = await invoiceNinjaNode.execute.call(mockExecuteFunctions);
			expect(result).toHaveLength(1);
		});
	});
});
