import { mock, mockDeep } from 'vitest-mock-extended';
import type {
	IBinaryData,
	IDataObject,
	IExecuteFunctions,
	INode,
	INodeTypeBaseDescription,
} from 'n8n-workflow';

import { MindeeV1 } from '../MindeeV1.node';

describe('MindeeV1 > execute', () => {
	const baseDescription: INodeTypeBaseDescription = {
		displayName: 'Mindee',
		name: 'mindee',
		icon: 'file:mindee.svg',
		group: ['input'],
		description: 'Consume Mindee API',
	};
	const node = new MindeeV1(baseDescription);
	const fileBuffer = Buffer.from('file');

	function createContext(parameters: Record<string, unknown>, continueOnFail = false) {
		const context = mockDeep<IExecuteFunctions>();
		context.getInputData.mockReturnValue([{ json: {} }]);
		context.getNode.mockReturnValue(mock<INode>());
		context.getNodeParameter.mockImplementation((name: string) => parameters[name] as never);
		context.continueOnFail.mockReturnValue(continueOnFail);
		context.helpers.assertBinaryData.mockReturnValue(mock<IBinaryData>({ fileName: 'doc.pdf' }));
		context.helpers.getBinaryDataBuffer.mockResolvedValue(fileBuffer);
		context.helpers.returnJsonArray.mockImplementation((items) =>
			(Array.isArray(items) ? items : [items]).map((json) => ({ json })),
		);
		return context;
	}

	const parameters = (resource: string, apiVersion: number, rawData: boolean) => ({
		resource,
		apiVersion,
		operation: 'predict',
		rawData,
		binaryPropertyName: 'data',
	});

	it.each([
		[
			'receipt',
			1,
			'mindeeReceiptApi',
			'https://api.mindee.net/products/expense_receipts/v2/predict',
			'file',
		],
		[
			'receipt',
			3,
			'mindeeReceiptApi',
			'https://api.mindee.net/v1/products/mindee/expense_receipts/v3/predict',
			'document',
		],
		[
			'receipt',
			4,
			'mindeeReceiptApi',
			'https://api.mindee.net/v1/products/mindee/expense_receipts/v4/predict',
			'document',
		],
		[
			'invoice',
			1,
			'mindeeInvoiceApi',
			'https://api.mindee.net/products/invoices/v1/predict',
			'file',
		],
		[
			'invoice',
			3,
			'mindeeInvoiceApi',
			'https://api.mindee.net/v1/products/mindee/invoices/v3/predict',
			'document',
		],
		[
			'invoice',
			4,
			'mindeeInvoiceApi',
			'https://api.mindee.net/v1/products/mindee/invoices/v4/predict',
			'document',
		],
	])(
		'should send the %s file for API version %s to the right endpoint',
		async (resource, apiVersion, credential, url, formField) => {
			const context = createContext(parameters(resource, apiVersion, true));
			context.helpers.requestWithAuthentication.mockResolvedValue({ id: 'raw' });

			const [output] = await node.execute.call(context);

			expect(context.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				credential,
				expect.objectContaining({
					method: 'POST',
					uri: expect.objectContaining({ value: url }),
					formData: {
						[formField]: { value: fileBuffer, options: { filename: 'doc.pdf' } },
					},
				}),
			);
			expect(output).toEqual([{ json: { id: 'raw' } }]);
		},
	);

	it.each(['receipt', 'invoice'])(
		'should clean the %s response of API version 1',
		async (resource) => {
			const context = createContext(parameters(resource, 1, false));
			context.helpers.requestWithAuthentication.mockResolvedValue({
				predictions: [{ total: { value: 5 }, locale: { currency: 'EUR', value: 'fr-FR' } }],
			});

			const [output] = await node.execute.call(context);

			expect(output).toEqual([{ json: { total: 5, currency: 'EUR', locale: 'fr-FR' } }]);
		},
	);

	it.each([
		['receipt', 3],
		['receipt', 4],
		['invoice', 3],
		['invoice', 4],
	])('should clean the %s response of API version %s', async (resource, apiVersion) => {
		const context = createContext(parameters(resource, apiVersion, false));
		const document: IDataObject = {
			id: 'doc-id',
			name: 'doc.pdf',
			n_pages: 1,
			inference: {
				prediction: {
					total_amount: { value: 10 },
					taxes: [{ amount: 2, rate: 20 }],
					locale: { currency: 'EUR', value: 'fr-FR' },
					line_items: [{ description: 'Item', quantity: 1, extra: 'ignored' }],
				},
			},
		};
		context.helpers.requestWithAuthentication.mockResolvedValue({ document });

		const [output] = await node.execute.call(context);

		expect(output).toEqual([
			{
				json: {
					id: 'doc-id',
					name: 'doc.pdf',
					number_of_pages: 1,
					total_amount: 10,
					taxes: { amount: 2, rate: 20 },
					currency: 'EUR',
					locale: 'fr-FR',
					line_items: [
						{
							description: 'Item',
							product_code: undefined,
							quantity: 1,
							tax_amount: undefined,
							tax_rate: undefined,
							total_amount: undefined,
							unit_price: undefined,
						},
					],
				},
			},
		]);
	});

	it.each(['receipt', 'invoice'])(
		'should reject an unknown API version for %s',
		async (resource) => {
			const context = createContext(parameters(resource, 2, true));

			await expect(node.execute.call(context)).rejects.toThrow('Invalid API version');
			expect(context.helpers.requestWithAuthentication).not.toHaveBeenCalled();
		},
	);

	it('should return the error when continue on fail is on', async () => {
		const context = createContext(parameters('invoice', 2, true), true);

		const [output] = await node.execute.call(context);

		expect(output).toEqual([{ json: { error: 'Invalid API version' } }]);
	});

	it('should return no items for an unknown resource', async () => {
		const context = createContext(parameters('other', 4, true));

		const [output] = await node.execute.call(context);

		expect(output).toEqual([]);
	});
});
