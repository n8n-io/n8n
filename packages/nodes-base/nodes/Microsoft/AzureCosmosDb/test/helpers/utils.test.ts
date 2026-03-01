import { mock } from 'jest-mock-extended';
import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INode,
	INodeExecutionData,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError, OperationalError } from 'n8n-workflow';

const azureCosmosDbApiRequest = jest.fn();
jest.mock('../../transport', () => ({ azureCosmosDbApiRequest }));

import { ErrorMap } from '../../helpers/errorHandler';
import {
	getPartitionKey,
	simplifyData,
	validateQueryParameters,
	processJsonInput,
	validatePartitionKey,
	validateCustomProperties,
} from '../../helpers/utils';

interface RequestBodyWithParameters extends IDataObject {
	parameters: Array<{ name: string; value: string }>;
}

const mockExecuteSingleFunctions = mock<IExecuteSingleFunctions>();
beforeEach(() => {
	jest.resetAllMocks();

	mockExecuteSingleFunctions.getNode.mockReturnValue({ name: 'MockNode' } as INode);
});

describe('getPartitionKey', () => {
	test('should return partition key when found', async () => {
		mockExecuteSingleFunctions.getNodeParameter.mockReturnValue('containerName');
		const mockApiResponse = {
			partitionKey: {
				paths: ['/partitionKeyPath'],
			},
		};
		azureCosmosDbApiRequest.mockResolvedValue(mockApiResponse);

		const result = await getPartitionKey.call(mockExecuteSingleFunctions);

		expect(result).toBe('partitionKeyPath');
	});

	test('should throw NodeOperationError if partition key is not found', async () => {
		mockExecuteSingleFunctions.getNodeParameter.mockReturnValue('containerName');
		const mockApiResponse = {};
		azureCosmosDbApiRequest.mockResolvedValue(mockApiResponse);

		await expect(getPartitionKey.call(mockExecuteSingleFunctions)).rejects.toThrowError(
			new NodeOperationError(mockExecuteSingleFunctions.getNode(), 'Partition key not found', {
				description: 'Failed to determine the partition key for this collection',
			}),
		);
	});

	test('should throw NodeApiError for 404 error', async () => {
		const containerName = 'containerName';
		mockExecuteSingleFunctions.getNodeParameter.mockReturnValue(containerName);

		const errorMessage = ErrorMap.Container.NotFound.getMessage(containerName);

		const mockError = new NodeApiError(
			mockExecuteSingleFunctions.getNode(),
			{},
			{
				httpCode: '404',
				message: errorMessage,
				description: ErrorMap.Container.NotFound.description,
			},
		);

		azureCosmosDbApiRequest.mockRejectedValue(mockError);

		await expect(getPartitionKey.call(mockExecuteSingleFunctions)).rejects.toThrowError(
			new NodeApiError(
				mockExecuteSingleFunctions.getNode(),
				{},
				{
					message: errorMessage,
					description: ErrorMap.Container.NotFound.description,
				},
			),
		);
	});
});

describe('validatePartitionKey', () => {
	let requestOptions: any;

	beforeEach(() => {
		requestOptions = { body: {}, headers: {} };

		azureCosmosDbApiRequest.mockClear();
	});

	test('should throw NodeOperationError when partition key is missing for "create" operation', async () => {
		mockExecuteSingleFunctions.getNodeParameter.mockReturnValueOnce('create');
		mockExecuteSingleFunctions.getNodeParameter.mockReturnValueOnce({});

		const mockApiResponse = {
			partitionKey: {
				paths: ['/partitionKeyPath'],
			},
		};
		azureCosmosDbApiRequest.mockResolvedValue(mockApiResponse);

		await expect(
			validatePartitionKey.call(mockExecuteSingleFunctions, requestOptions),
		).rejects.toThrowError(
			new NodeOperationError(
				mockExecuteSingleFunctions.getNode(),
				"Partition key not found in 'Item Contents'",
				{
					description:
						"Partition key 'partitionKey' must be present and have a valid, non-empty value in 'Item Contents'.",
				},
			),
		);
	});

	test('should throw NodeOperationError when partition key is missing for "update" operation', async () => {
		mockExecuteSingleFunctions.getNodeParameter.mockReturnValueOnce('update');
		mockExecuteSingleFunctions.getNodeParameter.mockReturnValueOnce({ partitionKey: '' });

		const mockApiResponse = {
			partitionKey: {
				paths: ['/partitionKeyPath'],
			},
		};
		azureCosmosDbApiRequest.mockResolvedValue(mockApiResponse);

		await expect(
			validatePartitionKey.call(mockExecuteSingleFunctions, requestOptions),
		).rejects.toThrowError(
			new NodeOperationError(
				mockExecuteSingleFunctions.getNode(),
				'Partition key is missing or empty',
				{
					description: 'Ensure the "Partition Key" field has a valid, non-empty value.',
				},
			),
		);
	});

	test('should throw NodeOperationError when partition key is missing for "get" operation', async () => {
		mockExecuteSingleFunctions.getNodeParameter.mockReturnValueOnce('get');
		mockExecuteSingleFunctions.getNodeParameter.mockReturnValueOnce(undefined);

		const mockApiResponse = {
			partitionKey: {
				paths: ['/partitionKeyPath'],
			},
		};
		azureCosmosDbApiRequest.mockResolvedValue(mockApiResponse);

		await expect(
			validatePartitionKey.call(mockExecuteSingleFunctions, requestOptions),
		).rejects.toThrowError(
			new NodeOperationError(
				mockExecuteSingleFunctions.getNode(),
				'Partition key is missing or empty',
				{
					description: 'Ensure the "Partition Key" field exists and has a valid, non-empty value.',
				},
			),
		);
	});

	test('should throw NodeOperationError when invalid JSON is provided for customProperties', async () => {
		mockExecuteSingleFunctions.getNodeParameter.mockReturnValueOnce('create');
		mockExecuteSingleFunctions.getNodeParameter.mockReturnValueOnce('invalidJson');

		const mockApiResponse = {
			partitionKey: {
				paths: ['/partitionKeyPath'],
			},
		};
		azureCosmosDbApiRequest.mockResolvedValue(mockApiResponse);

		await expect(
			validatePartitionKey.call(mockExecuteSingleFunctions, requestOptions),
		).rejects.toThrowError(
			new NodeOperationError(
				mockExecuteSingleFunctions.getNode(),
				'Invalid JSON format in "Item Contents"',
				{
					description: 'Ensure the "Item Contents" field contains a valid JSON object',
				},
			),
		);
	});
});

describe('simplifyData', () => {
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
	let requestOptions: IHttpRequestOptions;

	beforeEach(() => {
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

	test('should successfully map parameters when they match', async () => {
		mockExecuteSingleFunctions.getNodeParameter
			.mockReturnValueOnce('$1, $2')
			.mockReturnValueOnce({ queryParameters: 'value1, value2' });

		const result = await validateQueryParameters.call(mockExecuteSingleFunctions, requestOptions);

		if (result.body && (result.body as RequestBodyWithParameters).parameters) {
			expect((result.body as RequestBodyWithParameters).parameters).toEqual([
				{ name: '@Param1', value: 'value1' },
				{ name: '@Param2', value: 'value2' },
			]);
		} else {
			throw new OperationalError('Expected result.body to contain a parameters array');
		}
	});

	test('should correctly map parameters when query contains multiple dynamic values', async () => {
		mockExecuteSingleFunctions.getNodeParameter
			.mockReturnValueOnce('$1, $2, $3')
			.mockReturnValueOnce({ queryParameters: 'firstValue, secondValue, thirdValue' });

		const result = await validateQueryParameters.call(mockExecuteSingleFunctions, requestOptions);

		if (result.body && (result.body as RequestBodyWithParameters).parameters) {
			expect((result.body as RequestBodyWithParameters).parameters).toEqual([
				{ name: '@Param1', value: 'firstValue' },
				{ name: '@Param2', value: 'secondValue' },
				{ name: '@Param3', value: 'thirdValue' },
			]);
		} else {
			throw new OperationalError('Expected result.body to contain a parameters array');
		}
	});

	test('should extract and map parameter names correctly using regex', async () => {
		const query = '$1, $2, $3';
		const queryParamsString = 'value1, value2, value3';

		const parameterNames = query.replace(/\$(\d+)/g, '@param$1').match(/@\w+/g) ?? [];

		const parameterValues = queryParamsString.split(',').map((val) => val.trim());

		expect(parameterNames).toEqual(['@param1', '@param2', '@param3']);
		expect(parameterValues).toEqual(['value1', 'value2', 'value3']);
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
		const invalidJson = '{key: value}';
		expect(() => processJsonInput(invalidJson)).toThrowError(
			new OperationalError('Input must contain a valid JSON', { level: 'warning' }),
		);
	});

	test('should throw OperationalError for invalid non-string and non-object input', () => {
		const invalidInput = 123;
		expect(() => processJsonInput(invalidInput, 'testInput')).toThrowError(
			new OperationalError("Input 'testInput' must contain a valid JSON", { level: 'warning' }),
		);
	});
});

describe('validateCustomProperties', () => {
	let requestOptions: any;

	beforeEach(() => {
		requestOptions = { body: {}, headers: {}, url: 'http://mock.url' };
	});

	test('should merge custom properties into requestOptions.body for valid input', async () => {
		const validCustomProperties = { property1: 'value1', property2: 'value2' };
		mockExecuteSingleFunctions.getNodeParameter.mockReturnValue(validCustomProperties);

		const result = await validateCustomProperties.call(mockExecuteSingleFunctions, requestOptions);

		expect(result.body).toEqual({ property1: 'value1', property2: 'value2' });
	});

	test('should throw NodeOperationError when customProperties are empty, undefined, null, or contain only invalid values', async () => {
		const emptyCustomProperties = {};
		mockExecuteSingleFunctions.getNodeParameter.mockReturnValue(emptyCustomProperties);

		await expect(
			validateCustomProperties.call(mockExecuteSingleFunctions, requestOptions),
		).rejects.toThrowError(
			new NodeOperationError(mockExecuteSingleFunctions.getNode(), 'Item contents are empty', {
				description: 'Ensure the "Item Contents" field contains at least one valid property.',
			}),
		);

		const invalidValues = { property1: null, property2: '' };
		mockExecuteSingleFunctions.getNodeParameter.mockReturnValue(invalidValues);

		await expect(
			validateCustomProperties.call(mockExecuteSingleFunctions, requestOptions),
		).rejects.toThrowError(
			new NodeOperationError(mockExecuteSingleFunctions.getNode(), 'Item contents are empty', {
				description: 'Ensure the "Item Contents" field contains at least one valid property.',
			}),
		);
	});
});
