import {
	OperationalError,
	type IGetNodeParameterOptions,
	type ILoadOptionsFunctions,
} from 'n8n-workflow';

import { AzureCosmosDb } from '../../AzureCosmosDb.node';
import { HeaderConstants } from '../../helpers/constants';
import { credentials } from '../credentials';

describe('Azure Cosmos DB', () => {
	describe('List search', () => {
		it('should list search containers', async () => {
			const mockResponse = {
				body: {
					DocumentCollections: [
						{
							id: 'Container2',
						},
						{
							id: 'Container1',
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
					return credentials.microsoftAzureCosmosDbSharedKeyApi;
				}
				throw new OperationalError('Unknown credentials');
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
					{ name: 'Container1', value: 'Container1' },
					{ name: 'Container2', value: 'Container2' },
				],
				paginationToken: '4PVyAKoVaBQ=',
			});
		});

		it('should list search items', async () => {
			const mockResponse = {
				body: {
					Documents: [{ id: 'Item2' }, { id: 'Item1' }],
				},
				headers: {
					'x-ms-continuation': '4PVyAKoVaBQ=',
				},
			};

			const mockRequestWithAuthentication = jest.fn().mockReturnValue(mockResponse);

			const mockGetCurrentNodeParameter = jest.fn(
				(parameterName, options: IGetNodeParameterOptions) => {
					if (parameterName === 'container' && options.extractValue) {
						return 'Container1';
					}
					throw new OperationalError('Unknown parameter');
				},
			);

			const mockGetCredentials = jest.fn(async (type: string, _itemIndex?: number) => {
				if (type === 'microsoftAzureCosmosDbSharedKeyApi') {
					return credentials.microsoftAzureCosmosDbSharedKeyApi;
				}
				throw new OperationalError('Unknown credentials');
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
					url: 'https://n8n-us-east-account.documents.azure.com/dbs/database_1/colls/Container1/docs',
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
					{ name: 'Item1', value: 'Item1' },
					{ name: 'Item2', value: 'Item2' },
				],
				paginationToken: '4PVyAKoVaBQ=',
			});
		});
	});
});
