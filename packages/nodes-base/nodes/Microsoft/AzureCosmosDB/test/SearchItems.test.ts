import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { searchItems } from '../generalFunctions/dataFetching';

describe('GenericFunctions - searchItems', () => {
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
		mockContext.getNode = jest.fn().mockReturnValue({});
	});

	it('should fetch documents and return formatted results', async () => {
		(mockContext.getNodeParameter as jest.Mock).mockReturnValueOnce({
			mode: 'list',
			value: 'coll-1',
		});

		(mockContext.getCredentials as jest.Mock).mockResolvedValueOnce({
			account: 'us-east-1',
			database: 'first_database_1',
			baseUrl: 'https://us-east-1.documents.azure.com',
		});

		mockRequestWithAuthentication.mockResolvedValueOnce({
			Documents: [{ id: 'Item 1' }, { id: 'Item 2' }],
		});

		const response = await searchItems.call(mockContext);

		expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
			'microsoftAzureCosmosDbSharedKeyApi',
			expect.objectContaining({
				method: 'GET',
				url: '/colls/coll-1/docs',
			}),
		);

		expect(response).toEqual({
			results: [
				{ name: 'Item1', value: 'Item 1' },
				{ name: 'Item2', value: 'Item 2' },
			],
		});
	});

	it('should filter results based on the provided filter string', async () => {
		(mockContext.getNodeParameter as jest.Mock).mockReturnValueOnce({
			mode: 'list',
			value: 'coll-1',
		});

		(mockContext.getCredentials as jest.Mock).mockResolvedValueOnce({
			account: 'us-east-1',
			database: 'first_database_1',
			baseUrl: 'https://us-east-1.documents.azure.com',
		});

		mockRequestWithAuthentication.mockResolvedValueOnce({
			Documents: [{ id: 'TestItem' }, { id: 'ProdItem' }],
		});

		const response = await searchItems.call(mockContext, 'Test');

		expect(response).toEqual({
			results: [{ name: 'TestItem', value: 'TestItem' }],
		});
	});

	it('should return an empty array if no documents are found', async () => {
		(mockContext.getNodeParameter as jest.Mock).mockReturnValueOnce({
			mode: 'list',
			value: 'coll-1',
		});

		(mockContext.getCredentials as jest.Mock).mockResolvedValueOnce({
			account: 'us-east-1',
			database: 'first_database_1',
			baseUrl: 'https://us-east-1.documents.azure.com',
		});

		mockRequestWithAuthentication.mockResolvedValueOnce({
			Documents: [],
		});

		const response = await searchItems.call(mockContext);

		expect(response).toEqual({ results: [] });
	});

	it('should handle missing Documents property gracefully', async () => {
		(mockContext.getNodeParameter as jest.Mock).mockReturnValueOnce({
			mode: 'list',
			value: 'coll-1',
		});

		(mockContext.getCredentials as jest.Mock).mockResolvedValueOnce({
			account: 'us-east-1',
			database: 'first_database_1',
			baseUrl: 'https://us-east-1.documents.azure.com',
		});

		mockRequestWithAuthentication.mockResolvedValueOnce({
			unexpectedKey: 'value',
		});

		const response = await searchItems.call(mockContext);

		expect(response).toEqual({ results: [] });
	});

	it('should throw an error when container ID is missing', async () => {
		(mockContext.getNodeParameter as jest.Mock).mockReturnValueOnce({ mode: 'list', value: '' });

		await expect(searchItems.call(mockContext)).rejects.toThrowError(
			expect.objectContaining({
				message: 'Container is required to search items',
			}),
		);
	});
});
