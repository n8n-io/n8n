import type {
	IDataObject,
	IExecuteFunctions,
	INode,
	NodeExecutionWithMetadata,
} from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';
import { mock, mockDeep } from 'jest-mock-extended';

import { magentoApiRequest } from '../GenericFunctions';
import { Magento2 } from '../Magento2.node';

describe('Magento2 product get', () => {
	it.each([
		[1, 'AB%2F123', 'AB%2F123'],
		[1, 'Red%20Shirt', 'Red%20Shirt'],
		[1, 'AB/123', 'AB%2F123'],
		[1, 'A+B', 'A%2BB'],
		[1.1, 'AB%2F123', 'AB%252F123'],
		[1.1, 'Red%20Shirt', 'Red%2520Shirt'],
		[1.1, 'AB/123', 'AB%2F123'],
		[1.1, 'A+B', 'A%2BB'],
	])(
		'should send SKU on version %s %s in the path as %s',
		async (typeVersion, sku, expectedSku) => {
			const context = mockDeep<IExecuteFunctions>();
			const params: IDataObject = { resource: 'product', operation: 'get', sku };
			context.getNode.mockReturnValue(mock<INode>({ typeVersion }));
			context.getInputData.mockReturnValue([{ json: {} }]);
			context.getNodeParameter.mockImplementation((name: string) => params[name]);
			context.getCredentials.mockResolvedValue({ host: 'https://shop.example.com' });
			context.helpers.requestWithAuthentication.mockResolvedValue({ sku });
			context.helpers.returnJsonArray.mockImplementation((data) =>
				(Array.isArray(data) ? data : [data]).map((json) => ({ json })),
			);
			context.helpers.constructExecutionMetaData.mockImplementation(
				(data) => data as NodeExecutionWithMetadata[],
			);

			await new Magento2().execute.call(context);

			expect(context.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'magento2Api',
				expect.objectContaining({
					uri: expect.objectContaining({
						value: `https://shop.example.com/rest/default/V1/products/${expectedSku}`,
					}),
				}),
			);
		},
	);
});

describe('magentoApiRequest', () => {
	it('should encode path values and join them with the credentials host', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({ host: 'https://shop.example.com/' });
		context.helpers.requestWithAuthentication.mockResolvedValue({ sku: 'AB/123' });

		const sku = 'AB/123?x=1';
		await magentoApiRequest.call(context, 'GET', requestPath`/rest/default/V1/products/${sku}`);

		expect(context.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'magento2Api',
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://shop.example.com/rest/default/V1/products/AB%2F123%3Fx=1',
				}),
			}),
		);
	});
});
