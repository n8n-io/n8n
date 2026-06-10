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
	parameters: Array<{ name: string; value: string | number | boolean | null }>;
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

		const execution = getPartitionKey.call(mockExecuteSingleFunctions);
		await expect(execution).rejects.toThrow(NodeOperationError);
		await expect(execution).rejects.toThrow('Partition key not found');
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

		const execution = getPartitionKey.call(mockExecuteSingleFunctions);
		await expect(execution).rejects.toThrow(NodeApiError);
		await expect(execution).rejects.toThrow(errorMessage);
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

		const execution = validatePartitionKey.call(mockExecuteSingleFunctions, requestOptions);
		await expect(execution).rejects.toThrow(NodeOperationError);
		await expect(execution).rejects.toThrow("Partition key not found in 'Item Contents'");
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

		const execution = validatePartitionKey.call(mockExecuteSingleFunctions, requestOptions);
		await expect(execution).rejects.toThrow(NodeOperationError);
		await expect(execution).rejects.toThrow('Partition key is missing or empty');
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

		const execution = validatePartitionKey.call(mockExecuteSingleFunctions, requestOptions);
		await expect(execution).rejects.toThrow(NodeOperationError);
		await expect(execution).rejects.toThrow('Partition key is missing or empty');
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

		const execution = validatePartitionKey.call(mockExecuteSingleFunctions, requestOptions);
		await expect(execution).rejects.toThrow(NodeOperationError);
		await expect(execution).rejects.toThrow('Invalid JSON format in "Item Contents"');
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

		const execution = validateQueryParameters.call(mockExecuteSingleFunctions, requestOptions);
		await expect(execution).rejects.toThrow(NodeOperationError);
		await expect(execution).rejects.toThrow('Empty parameter value provided');
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

	test('should treat all comma-separated values as strings (regression: no numeric heuristic)', async () => {
		mockExecuteSingleFunctions.getNodeParameter
			.mockReturnValueOnce('$1, $2')
			.mockReturnValueOnce({ queryParameters: 'P12223, 1737062400000' });

		const result = await validateQueryParameters.call(mockExecuteSingleFunctions, requestOptions);

		expect((result.body as RequestBodyWithParameters).parameters).toEqual([
			{ name: '@Param1', value: 'P12223' },
			{ name: '@Param2', value: '1737062400000' },
		]);
	});

	describe('queryParametersJson', () => {
		test('should preserve string with leading zeros', async () => {
			mockExecuteSingleFunctions.getNodeParameter
				.mockReturnValueOnce('$1')
				.mockReturnValueOnce({ queryParametersJson: '["012345"]' });

			const result = await validateQueryParameters.call(mockExecuteSingleFunctions, requestOptions);

			expect((result.body as RequestBodyWithParameters).parameters).toEqual([
				{ name: '@Param1', value: '012345' },
			]);
		});

		test('should preserve integer value', async () => {
			mockExecuteSingleFunctions.getNodeParameter
				.mockReturnValueOnce('$1')
				.mockReturnValueOnce({ queryParametersJson: '[1737062400000]' });

			const result = await validateQueryParameters.call(mockExecuteSingleFunctions, requestOptions);

			expect((result.body as RequestBodyWithParameters).parameters).toEqual([
				{ name: '@Param1', value: 1737062400000 },
			]);
		});

		test('should lose precision for integers larger than Number.MAX_SAFE_INTEGER', async () => {
			mockExecuteSingleFunctions.getNodeParameter
				.mockReturnValueOnce('$1')
				.mockReturnValueOnce({ queryParametersJson: '[9007199254740993]' });

			const result = await validateQueryParameters.call(mockExecuteSingleFunctions, requestOptions);

			expect((result.body as RequestBodyWithParameters).parameters).toEqual([
				{ name: '@Param1', value: 9007199254740992 },
			]);
		});

		test('should preserve boolean values', async () => {
			mockExecuteSingleFunctions.getNodeParameter
				.mockReturnValueOnce('$1, $2')
				.mockReturnValueOnce({ queryParametersJson: '[true, false]' });

			const result = await validateQueryParameters.call(mockExecuteSingleFunctions, requestOptions);

			expect((result.body as RequestBodyWithParameters).parameters).toEqual([
				{ name: '@Param1', value: true },
				{ name: '@Param2', value: false },
			]);
		});

		test('should preserve null value', async () => {
			mockExecuteSingleFunctions.getNodeParameter
				.mockReturnValueOnce('$1')
				.mockReturnValueOnce({ queryParametersJson: '[null]' });

			const result = await validateQueryParameters.call(mockExecuteSingleFunctions, requestOptions);

			expect((result.body as RequestBodyWithParameters).parameters).toEqual([
				{ name: '@Param1', value: null },
			]);
		});

		test('should handle empty string value', async () => {
			mockExecuteSingleFunctions.getNodeParameter
				.mockReturnValueOnce('$1')
				.mockReturnValueOnce({ queryParametersJson: '[""]' });

			const result = await validateQueryParameters.call(mockExecuteSingleFunctions, requestOptions);

			expect((result.body as RequestBodyWithParameters).parameters).toEqual([
				{ name: '@Param1', value: '' },
			]);
		});

		test('should handle empty parameters array', async () => {
			mockExecuteSingleFunctions.getNodeParameter
				.mockReturnValueOnce('')
				.mockReturnValueOnce({ queryParametersJson: '[]' });

			const result = await validateQueryParameters.call(mockExecuteSingleFunctions, requestOptions);

			expect((result.body as RequestBodyWithParameters).parameters).toEqual([]);
		});

		test('should handle mixed types', async () => {
			mockExecuteSingleFunctions.getNodeParameter
				.mockReturnValueOnce('$1, $2, $3, $4')
				.mockReturnValueOnce({ queryParametersJson: '[1737062400000, "01234", true, null]' });

			const result = await validateQueryParameters.call(mockExecuteSingleFunctions, requestOptions);

			expect((result.body as RequestBodyWithParameters).parameters).toEqual([
				{ name: '@Param1', value: 1737062400000 },
				{ name: '@Param2', value: '01234' },
				{ name: '@Param3', value: true },
				{ name: '@Param4', value: null },
			]);
		});

		test('should throw NodeOperationError when value is not a JSON array', async () => {
			mockExecuteSingleFunctions.getNodeParameter
				.mockReturnValueOnce('$1')
				.mockReturnValueOnce({ queryParametersJson: '{"a": 1}' });

			const execution = validateQueryParameters.call(mockExecuteSingleFunctions, requestOptions);
			await expect(execution).rejects.toThrow(NodeOperationError);
			await expect(execution).rejects.toThrow('Query Parameters (JSON) must be a JSON array');
		});
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
		const throwFn = () => processJsonInput(invalidJson);
		expect(throwFn).toThrow(OperationalError);
		expect(throwFn).toThrow('Input must contain a valid JSON');
	});

	test('should throw OperationalError for invalid non-string and non-object input', () => {
		const invalidInput = 123;
		const throwFn = () => processJsonInput(invalidInput, 'testInput');
		expect(throwFn).toThrow(OperationalError);
		expect(throwFn).toThrow("Input 'testInput' must contain a valid JSON");
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

		const emptyExecution = validateCustomProperties.call(
			mockExecuteSingleFunctions,
			requestOptions,
		);
		await expect(emptyExecution).rejects.toThrow(NodeOperationError);
		await expect(emptyExecution).rejects.toThrow('Item contents are empty');

		const invalidValues = { property1: null, property2: '' };
		mockExecuteSingleFunctions.getNodeParameter.mockReturnValue(invalidValues);

		const invalidExecution = validateCustomProperties.call(
			mockExecuteSingleFunctions,
			requestOptions,
		);
		await expect(invalidExecution).rejects.toThrow(NodeOperationError);
		await expect(invalidExecution).rejects.toThrow('Item contents are empty');
	});
});
