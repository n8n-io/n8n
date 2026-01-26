import { mock, mockDeep } from 'jest-mock-extended';
import type { ILoadOptionsFunctions, INode } from 'n8n-workflow';

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
});
