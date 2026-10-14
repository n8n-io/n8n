import { mock, mockDeep } from 'vitest-mock-extended';
import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INode,
	NodeExecutionWithMetadata,
} from 'n8n-workflow';

import { Xero } from '../Xero.node';

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
						uri: 'https://api.xero.com/api.xro/2.0/Currencies',
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
		['invoice', 'Invoices'],
		['contact', 'Contacts'],
	])('%s getAll with returnAll', (resource, propertyName) => {
		it('should send the Xero-tenant-id header on every page', async () => {
			const xero = new Xero();
			const executeFunctions = mockDeep<IExecuteFunctions>();
			const params: IDataObject = {
				resource,
				operation: 'getAll',
				organizationId: 'test-org-id',
				returnAll: true,
				options: {},
			};

			executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
			executeFunctions.getNode.mockReturnValue(mock<INode>());
			executeFunctions.getNodeParameter.mockImplementation((name: string) => params[name]);
			executeFunctions.helpers.constructExecutionMetaData.mockImplementation(
				(data) => data as NodeExecutionWithMetadata[],
			);
			executeFunctions.helpers.returnJsonArray.mockImplementation((data) =>
				(Array.isArray(data) ? data : [data]).map((json) => ({ json })),
			);
			executeFunctions.helpers.requestOAuth2
				.mockResolvedValueOnce({ [propertyName]: [{ id: 1 }] })
				.mockResolvedValueOnce({ [propertyName]: [{ id: 2 }] })
				.mockResolvedValueOnce({ [propertyName]: [] });

			const result = await xero.execute.call(executeFunctions);

			expect(result[0].map(({ json }) => json)).toEqual([{ id: 1 }, { id: 2 }]);
			const calls = executeFunctions.helpers.requestOAuth2.mock.calls;
			expect(calls).toHaveLength(3);
			calls.forEach(([, options], index) => {
				expect(options.headers).toEqual(
					expect.objectContaining({ 'Xero-tenant-id': 'test-org-id' }),
				);
				expect(options.qs).toEqual(expect.objectContaining({ page: index + 1 }));
			});
		});
	});
});
