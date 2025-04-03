/* eslint-disable n8n-nodes-base/node-param-display-name-miscased */
import type { IHttpRequestOptions, INodeExecutionData } from 'n8n-workflow';
import { NodeApiError, NodeOperationError, OperationalError } from 'n8n-workflow';

import { ErrorMap } from '../../helpers/errorHandler';
import {
	getPartitionKey,
	simplifyData,
	validateQueryParameters,
	processJsonInput,
} from '../../helpers/utils';
import { azureCosmosDbApiRequest } from '../../transport';

jest.mock('n8n-workflow', () => ({
	...jest.requireActual('n8n-workflow'),
	azureCosmosDbApiRequest: jest.fn(),
}));

jest.mock('../../transport', () => ({
	azureCosmosDbApiRequest: jest.fn(),
}));

describe('getPartitionKey', () => {
	let mockExecuteSingleFunctions: any;

	beforeEach(() => {
		mockExecuteSingleFunctions = {
			getNodeParameter: jest.fn(),
			getNode: jest.fn(() => ({ name: 'MockNode' })),
		};
	});

	test('should return partition key when found', async () => {
		mockExecuteSingleFunctions.getNodeParameter.mockReturnValue('containerName');
		const mockApiResponse = {
			partitionKey: {
				paths: ['/partitionKeyPath'],
			},
		};
		(azureCosmosDbApiRequest as jest.Mock).mockResolvedValue(mockApiResponse);

		const result = await getPartitionKey.call(mockExecuteSingleFunctions);

		expect(result).toBe('partitionKeyPath');
	});

	test('should throw NodeOperationError if partition key is not found', async () => {
		mockExecuteSingleFunctions.getNodeParameter.mockReturnValue('containerName');
		const mockApiResponse = {};
		(azureCosmosDbApiRequest as jest.Mock).mockResolvedValue(mockApiResponse);

		await expect(getPartitionKey.call(mockExecuteSingleFunctions)).rejects.toThrowError(
			new NodeOperationError(mockExecuteSingleFunctions.getNode(), 'Partition key not found', {
				description: 'Failed to determine the partition key for this collection',
			}),
		);
	});

	test('should throw NodeApiError for 404 error', async () => {
		mockExecuteSingleFunctions.getNodeParameter.mockReturnValue('containerName');

		const mockError = new NodeApiError(
			mockExecuteSingleFunctions.getNode(),
			{},
			{
				message: ErrorMap.Container.NotFound.message,
				description: ErrorMap.Container.NotFound.description,
			},
		);

		(azureCosmosDbApiRequest as jest.Mock).mockRejectedValue(mockError);

		await expect(getPartitionKey.call(mockExecuteSingleFunctions)).rejects.toThrowError(
			new NodeApiError(mockExecuteSingleFunctions.getNode(), {}, ErrorMap.Container.NotFound),
		);
	});
});

describe('simplifyData', () => {
	let mockExecuteSingleFunctions: any;

	beforeEach(() => {
		mockExecuteSingleFunctions = {
			getNodeParameter: jest.fn(),
			getNode: jest.fn(() => ({ name: 'MockNode' })),
		};
	});

	test('should return the same data when "simple" parameter is false', async () => {
		mockExecuteSingleFunctions.getNodeParameter.mockReturnValue(false);
		const items = [{ json: { foo: 'bar' } }] as INodeExecutionData[];

		const result = await simplifyData.call(mockExecuteSingleFunctions, items, {} as any);

		expect(result).toEqual(items);
	});

	test('should simplify the data when "simple" parameter is true', async () => {
		mockExecuteSingleFunctions.getNodeParameter.mockReturnValue(true);
		const items = [{ json: { _internalKey: 'value', foo: 'bar' } }] as INodeExecutionData[];

		const result = await simplifyData.call(mockExecuteSingleFunctions, items, {} as any);

		expect(result).toEqual([{ json: { foo: 'bar' } }]);
	});
});

describe('validateQueryParameters', () => {
	let mockExecuteSingleFunctions: any;
	let requestOptions: IHttpRequestOptions;

	beforeEach(() => {
		mockExecuteSingleFunctions = {
			getNodeParameter: jest.fn(),
			getNode: jest.fn(() => ({ name: 'MockNode' })),
		};
		requestOptions = { body: {}, headers: {} } as IHttpRequestOptions;
	});

	test('should throw NodeOperationError when parameter values do not match', async () => {
		mockExecuteSingleFunctions.getNodeParameter
			.mockReturnValueOnce('$1')
			.mockReturnValueOnce({ queryParameters: 'param1, param2' });

		await expect(
			validateQueryParameters.call(mockExecuteSingleFunctions, requestOptions),
		).rejects.toThrowError(
			new NodeOperationError(
				mockExecuteSingleFunctions.getNode(),
				'Empty parameter value provided',
				{
					description: 'Please provide non-empty values for the query parameters',
				},
			),
		);
	});
});

describe('processJsonInput', () => {
	test('should return parsed JSON when input is a valid JSON string', () => {
		const result = processJsonInput('{"key": "value"}');

		expect(result).toEqual({ key: 'value' });
	});

	test('should return input data when it is already an object', () => {
		const result = processJsonInput({ key: 'value' });

		expect(result).toEqual({ key: 'value' });
	});

	test('should throw OperationalError for invalid JSON string', () => {
		expect(() => processJsonInput('{key: value}')).toThrowError(
			new OperationalError('Input must contain a valid JSON', { level: 'warning' }),
		);
	});
});
