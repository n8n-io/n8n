import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { fetchPartitionKeyField } from '../generalFunctions/dataFetching';

describe('GenericFunctions - fetchPartitionKeyField', () => {
	const mockMicrosoftCosmosDbRequest = jest.fn();

	const mockContext = {
		helpers: {
			requestWithAuthentication: mockMicrosoftCosmosDbRequest,
		},
		getNodeParameter: jest.fn(),
		getCredentials: jest.fn(),
	} as unknown as ILoadOptionsFunctions;

	beforeEach(() => {
		jest.clearAllMocks();
		mockContext.getNode = jest.fn().mockReturnValue({});

		(mockContext.getCredentials as jest.Mock).mockResolvedValueOnce({
			account: 'us-east-1',
			database: 'test_database',
			baseUrl: 'https://us-east-1.documents.azure.com',
		});
	});

	it('should fetch the partition key successfully', async () => {
		(mockContext.getNodeParameter as jest.Mock).mockReturnValueOnce({
			mode: 'list',
			value: 'coll-1',
		});

		mockMicrosoftCosmosDbRequest.mockResolvedValueOnce({
			partitionKey: {
				paths: ['/PartitionKey'],
				kind: 'Hash',
				version: 2,
			},
		});

		const response = await fetchPartitionKeyField.call(mockContext);

		expect(mockMicrosoftCosmosDbRequest).toHaveBeenCalledWith(
			'microsoftAzureCosmosDbSharedKeyApi',
			expect.objectContaining({
				method: 'GET',
				url: '/colls/coll-1',
			}),
		);

		expect(response).toEqual({
			results: [
				{
					name: 'PartitionKey',
					value: 'PartitionKey',
				},
			],
		});
	});

	it('should throw an error when container ID is missing', async () => {
		(mockContext.getNodeParameter as jest.Mock).mockReturnValueOnce({ mode: 'list', value: '' });

		await expect(fetchPartitionKeyField.call(mockContext)).rejects.toThrowError(
			expect.objectContaining({
				message: 'Container is required to search items',
			}),
		);
	});

	it('should return an empty array if no partition key is found', async () => {
		(mockContext.getNodeParameter as jest.Mock).mockReturnValueOnce({
			mode: 'list',
			value: 'coll-1',
		});

		mockMicrosoftCosmosDbRequest.mockResolvedValueOnce({
			partitionKey: {
				paths: [],
				kind: 'Hash',
				version: 2,
			},
		});

		const response = await fetchPartitionKeyField.call(mockContext);

		expect(response).toEqual({ results: [] });
	});

	it('should handle unexpected response format gracefully', async () => {
		(mockContext.getNodeParameter as jest.Mock).mockReturnValueOnce({
			mode: 'list',
			value: 'coll-1',
		});

		mockMicrosoftCosmosDbRequest.mockResolvedValueOnce({ unexpectedKey: 'value' });

		const response = await fetchPartitionKeyField.call(mockContext);

		expect(response).toEqual({ results: [] });
	});
});
