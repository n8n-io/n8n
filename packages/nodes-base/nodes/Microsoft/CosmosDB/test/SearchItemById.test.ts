import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { searchItemById } from '../GenericFunctions';

describe('GenericFunctions - searchItemById', () => {
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

	it('should fetch the item successfully', async () => {
		(mockContext.getNodeParameter as jest.Mock).mockReturnValueOnce({
			mode: 'list',
			value: 'coll-1',
		});
		const itemId = 'item-123';

		(mockContext.getCredentials as jest.Mock).mockResolvedValueOnce({
			account: 'us-east-1',
			database: 'first_database_1',
			baseUrl: 'https://us-east-1.documents.azure.com',
		});

		mockRequestWithAuthentication.mockResolvedValueOnce({
			id: itemId,
			name: 'Test Item',
		});

		const response = await searchItemById.call(mockContext, itemId);

		expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
			'microsoftCosmosDbSharedKeyApi',
			expect.objectContaining({
				method: 'GET',
				url: '/colls/coll-1/docs/item-123',
			}),
		);

		expect(response).toEqual({
			id: itemId,
			name: 'Test Item',
		});
	});

	it('should throw an error when container ID is missing', async () => {
		(mockContext.getNodeParameter as jest.Mock).mockReturnValueOnce({ mode: 'list', value: '' });

		await expect(searchItemById.call(mockContext, 'item-123')).rejects.toThrowError(
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
			expect.objectContaining({
				message: 'Container is required',
			}),
		);
	});

	it('should throw an error when item ID is missing', async () => {
		(mockContext.getNodeParameter as jest.Mock).mockReturnValueOnce({
			mode: 'list',
			value: 'coll-1',
		});

		await expect(searchItemById.call(mockContext, '')).rejects.toThrowError(
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
			expect.objectContaining({
				message: 'Item is required',
			}),
		);
	});

	it('should return null if the response is empty', async () => {
		(mockContext.getNodeParameter as jest.Mock).mockReturnValueOnce({
			mode: 'list',
			value: 'coll-1',
		});
		const itemId = 'item-123';

		(mockContext.getCredentials as jest.Mock).mockResolvedValueOnce({
			account: 'us-east-1',
			database: 'first_database_1',
			baseUrl: 'https://us-east-1.documents.azure.com',
		});

		mockRequestWithAuthentication.mockResolvedValueOnce(null);

		const response = await searchItemById.call(mockContext, itemId);

		expect(response).toBeNull();
	});

	it('should handle unexpected response format gracefully', async () => {
		(mockContext.getNodeParameter as jest.Mock).mockReturnValueOnce({
			mode: 'list',
			value: 'coll-1',
		});
		const itemId = 'item-123';

		(mockContext.getCredentials as jest.Mock).mockResolvedValueOnce({
			account: 'us-east-1',
			database: 'first_database_1',
			baseUrl: 'https://us-east-1.documents.azure.com',
		});

		mockRequestWithAuthentication.mockResolvedValueOnce({ unexpectedKey: 'value' });

		const response = await searchItemById.call(mockContext, itemId);

		expect(response).toEqual({ unexpectedKey: 'value' });
	});
});
