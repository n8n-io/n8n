/* eslint-disable n8n-local-rules/no-plain-errors */
/* eslint-disable n8n-nodes-base/node-param-display-name-miscased */
import type { IGetNodeParameterOptions, ILoadOptionsFunctions } from 'n8n-workflow';

import { FAKE_CREDENTIALS_DATA } from '../../../../../test/nodes/FakeCredentialsMap';
import { AzureCosmosDb } from '../../AzureCosmosDb.node';
import { HeaderConstants } from '../../helpers/constants';

describe('Azure Cosmos DB', () => {
	describe('List search', () => {
		it('should list search containers', async () => {
			const mockResponse = {
				body: {
					DocumentCollections: [
						{
							id: 'container2',
						},
						{
							id: 'container1',
						},
					],
				},
				headers: {
					'x-ms-continuation': '4PVyAKoVaBQ=',
				},
			};

			const mockRequestWithAuthentication = jest.fn().mockReturnValue(mockResponse);

			const mockGetCredentials = jest.fn(async (type: string, _itemIndex?: number) => {
				if (type === 'microsoftAzureCosmosDbSharedKeyApi') {
					return FAKE_CREDENTIALS_DATA.microsoftAzureCosmosDbSharedKeyApi;
				}
				throw new Error('Unknown credentials');
			});

			const mockContext = {
				getCredentials: mockGetCredentials,
				helpers: {
					httpRequestWithAuthentication: mockRequestWithAuthentication,
				},
			} as unknown as ILoadOptionsFunctions;

			const node = new AzureCosmosDb();

			const paginationToken = '4PVyAKoVaBQ=';

			const listSearchResult = await node.methods.listSearch.searchContainers.call(
				mockContext,
				'',
				paginationToken,
			);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftAzureCosmosDbSharedKeyApi',
				expect.objectContaining({
					method: 'GET',
					url: 'https://n8n-us-east-account.documents.azure.com/dbs/database_1/colls',
					headers: {
						[HeaderConstants.X_MS_CONTINUATION]: paginationToken,
					},
					qs: {},
					body: {},
					json: true,
					returnFullResponse: true,
				}),
			);

			expect(listSearchResult).toEqual({
				results: [
					{ name: 'container1', value: 'container1' },
					{ name: 'container2', value: 'container2' },
				],
				paginationToken: '4PVyAKoVaBQ=',
			});
		});

		it('should list search items', async () => {
			const mockResponse = {
				body: {
					Documents: [{ id: 'item2' }, { id: 'item1' }],
				},
				headers: {
					'x-ms-continuation': '4PVyAKoVaBQ=',
				},
			};

			const mockRequestWithAuthentication = jest.fn().mockReturnValue(mockResponse);

			const mockGetCurrentNodeParameter = jest.fn(
				(parameterName, options: IGetNodeParameterOptions) => {
					if (parameterName === 'container' && options.extractValue) {
						return 'container1';
					}
					throw new Error('Unknown parameter');
				},
			);

			const mockGetCredentials = jest.fn(async (type: string, _itemIndex?: number) => {
				if (type === 'microsoftAzureCosmosDbSharedKeyApi') {
					return FAKE_CREDENTIALS_DATA.microsoftAzureCosmosDbSharedKeyApi;
				}
				throw new Error('Unknown credentials');
			});

			const mockContext = {
				getCredentials: mockGetCredentials,
				getCurrentNodeParameter: mockGetCurrentNodeParameter,
				helpers: {
					httpRequestWithAuthentication: mockRequestWithAuthentication,
				},
			} as unknown as ILoadOptionsFunctions;

			const node = new AzureCosmosDb();

			const paginationToken = '4PVyAKoVaBQ=';
			const listSearchResult = await node.methods.listSearch.searchItems.call(
				mockContext,
				'',
				paginationToken,
			);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftAzureCosmosDbSharedKeyApi',
				expect.objectContaining({
					method: 'GET',
					url: 'https://n8n-us-east-account.documents.azure.com/dbs/database_1/colls/container1/docs',
					headers: {
						[HeaderConstants.X_MS_CONTINUATION]: paginationToken,
					},
					qs: {},
					body: {},
					json: true,
					returnFullResponse: true,
				}),
			);

			expect(listSearchResult).toEqual({
				results: [
					{ name: 'item1', value: 'item1' },
					{ name: 'item2', value: 'item2' },
				],
				paginationToken: '4PVyAKoVaBQ=',
			});
		});
	});
});
