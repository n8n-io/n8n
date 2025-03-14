import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { searchContainers } from '../generalFunctions/dataFetching';

describe('GenericFunctions - searchContainers', () => {
	const mockRequestWithAuthentication = jest.fn();

	const mockContext = {
		helpers: {
			requestWithAuthentication: mockRequestWithAuthentication,
		},
		getNodeParameter: jest.fn(),
		getCredentials: jest.fn(),
	} as unknown as ILoadOptionsFunctions;

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should make a GET request to fetch containers and return results', async () => {
		(mockContext.getCredentials as jest.Mock).mockResolvedValueOnce({
			account: 'us-east-1',
			database: 'first_database_1',
			baseUrl: 'https://us-east-1.documents.azure.com',
		});

		mockRequestWithAuthentication.mockResolvedValueOnce({
			DocumentCollections: [{ id: 'Collection1' }, { id: 'Collection2' }],
		});

		const response = await searchContainers.call(mockContext);

		expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
			'microsoftAzureCosmosDbSharedKeyApi',
			expect.objectContaining({
				baseURL: 'https://us-east-1.documents.azure.com',
				method: 'GET',
				url: '/colls',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
				},
				json: true,
			}),
		);

		expect(response).toEqual({
			results: [
				{ name: 'Collection1', value: 'Collection1' },
				{ name: 'Collection2', value: 'Collection2' },
			],
		});
	});

	it('should filter containers by the provided filter string', async () => {
		(mockContext.getCredentials as jest.Mock).mockResolvedValueOnce({
			account: 'us-east-1',
			database: 'first_database_1',
			baseUrl: 'https://us-east-1.documents.azure.com',
		});

		mockRequestWithAuthentication.mockResolvedValueOnce({
			DocumentCollections: [{ id: 'Test-Col-1' }, { id: 'Prod-Col-1' }],
		});

		const response = await searchContainers.call(mockContext, 'Test');

		expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
			'microsoftAzureCosmosDbSharedKeyApi',
			expect.objectContaining({
				baseURL: 'https://us-east-1.documents.azure.com',
				method: 'GET',
				url: '/colls',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
				},
				json: true,
			}),
		);

		expect(response).toEqual({
			results: [{ name: 'Test-Col-1', value: 'Test-Col-1' }],
		});
	});

	it('should sort containers alphabetically by name', async () => {
		(mockContext.getCredentials as jest.Mock).mockResolvedValueOnce({ account: 'us-east-1' });
		(mockContext.getNodeParameter as jest.Mock).mockReturnValueOnce('db-id-1');

		mockRequestWithAuthentication.mockResolvedValueOnce({
			DocumentCollections: [{ id: 'z-col' }, { id: 'a-col' }, { id: 'm-col' }],
		});

		const response = await searchContainers.call(mockContext);

		expect(response).toEqual({
			results: [
				{ name: 'a-col', value: 'a-col' },
				{ name: 'm-col', value: 'm-col' },
				{ name: 'z-col', value: 'z-col' },
			],
		});
	});

	it('should handle empty results when no containers are returned', async () => {
		(mockContext.getCredentials as jest.Mock).mockResolvedValueOnce({ account: 'us-east-1' });
		(mockContext.getNodeParameter as jest.Mock).mockReturnValueOnce('db-id-1');

		mockRequestWithAuthentication.mockResolvedValueOnce({
			DocumentCollections: [],
		});

		const response = await searchContainers.call(mockContext);

		expect(response).toEqual({ results: [] });
	});

	it('should handle missing DocumentCollections property', async () => {
		(mockContext.getCredentials as jest.Mock).mockResolvedValueOnce({ account: 'us-east-1' });
		(mockContext.getNodeParameter as jest.Mock).mockReturnValueOnce('db-id-1');

		mockRequestWithAuthentication.mockResolvedValueOnce({
			unexpectedkey: 'value',
		});
		const response = await searchContainers.call(mockContext);

		expect(response).toEqual({ results: [] });
	});
});
