import { mock, mockDeep } from 'jest-mock-extended';
import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INode,
	NodeExecutionWithMetadata,
} from 'n8n-workflow';

import { Xero } from '../Xero.node';

function createExecuteFunctions(params: IDataObject, typeVersion = 1.1) {
	const executeFunctions = mockDeep<IExecuteFunctions>();
	executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
	executeFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion }));
	executeFunctions.getNodeParameter.mockImplementation((name: string) => params[name]);
	executeFunctions.helpers.constructExecutionMetaData.mockImplementation(
		(data) => data as NodeExecutionWithMetadata[],
	);
	executeFunctions.helpers.returnJsonArray.mockImplementation((data) =>
		(Array.isArray(data) ? data : [data]).map((json) => ({ json })),
	);
	return executeFunctions;
}

describe('Xero Node', () => {
	describe('loadOptions', () => {
		describe('getCurrencies', () => {
			it('should return currencies with description as display name and code as value', async () => {
				// Setup mock
				const xero = new Xero();
				const loadOptionsFunctions = mockDeep<ILoadOptionsFunctions>();

				loadOptionsFunctions.getNode.mockReturnValue(mock<INode>());
				loadOptionsFunctions.getCurrentNodeParameter.mockReturnValue('test-org-id');

				// Mock Xero API response via requestOAuth2
				loadOptionsFunctions.helpers.requestOAuth2.mockResolvedValue({
					Currencies: [
						{
							Code: 'EUR',
							Description: 'Euro',
						},
						{
							Code: 'GBP',
							Description: 'British Pound',
						},
						{
							Code: 'USD',
							Description: 'US Dollar',
						},
					],
				});

				// Call getCurrencies
				const result = await xero.methods.loadOptions.getCurrencies.call(loadOptionsFunctions);

				// Verify dropdown shows description but sends code
				expect(result).toEqual([
					{ name: 'Euro', value: 'EUR' },
					{ name: 'British Pound', value: 'GBP' },
					{ name: 'US Dollar', value: 'USD' },
				]);

				// Verify API was called correctly
				expect(loadOptionsFunctions.helpers.requestOAuth2).toHaveBeenCalledWith(
					'xeroOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: expect.objectContaining({
							value: 'https://api.xero.com/api.xro/2.0/Currencies',
						}),
						headers: expect.objectContaining({
							'Xero-tenant-id': 'test-org-id',
						}),
					}),
				);
			});

			it('should handle empty currency list', async () => {
				// Setup mock
				const xero = new Xero();
				const loadOptionsFunctions = mockDeep<ILoadOptionsFunctions>();

				loadOptionsFunctions.getNode.mockReturnValue(mock<INode>());
				loadOptionsFunctions.getCurrentNodeParameter.mockReturnValue('test-org-id');

				// Mock empty response via requestOAuth2
				loadOptionsFunctions.helpers.requestOAuth2.mockResolvedValue({
					Currencies: [],
				});

				// Call getCurrencies
				const result = await xero.methods.loadOptions.getCurrencies.call(loadOptionsFunctions);

				// Verify returns empty array
				expect(result).toEqual([]);
			});
		});
	});

	describe.each([
		['invoice', 'invoiceId', 'Invoices'],
		['contact', 'contactId', 'Contacts'],
	])('%s get', (resource, idParameter, propertyName) => {
		it.each([
			[1, 'INV%2F2024%2F01', 'INV%2F2024%2F01'],
			[1, 'INV/2024/01', 'INV%2F2024%2F01'],
			[1, 'A+B', 'A%2BB'],
			[1.1, 'INV%2F2024%2F01', 'INV%252F2024%252F01'],
			[1.1, 'INV/2024/01', 'INV%2F2024%2F01'],
			[1.1, 'A+B', 'A%2BB'],
		])(
			'should send ID at version %s and value %s in the path as %s',
			async (typeVersion, id, expectedId) => {
				const xero = new Xero();
				const executeFunctions = createExecuteFunctions(
					{
						resource,
						operation: 'get',
						organizationId: 'test-org-id',
						[idParameter]: id,
					},
					typeVersion,
				);
				executeFunctions.helpers.requestOAuth2.mockResolvedValue({ [propertyName]: [] });

				await xero.execute.call(executeFunctions);

				expect(executeFunctions.helpers.requestOAuth2).toHaveBeenCalledWith(
					'xeroOAuth2Api',
					expect.objectContaining({
						uri: expect.objectContaining({
							value: `https://api.xero.com/api.xro/2.0/${propertyName}/${expectedId}`,
						}),
					}),
				);
			},
		);
	});
});
