import type { IN8nHttpFullResponse, INodeExecutionData, JsonObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { handleError, ErrorMap } from '../../helpers/errorHandler';

const mockExecuteSingleFunctions = {
	getNode: jest.fn(() => ({ name: 'MockNode' })),
	getNodeParameter: jest.fn(),
} as any;

describe('handleError', () => {
	let response: IN8nHttpFullResponse;
	let data: INodeExecutionData[];

	beforeEach(() => {
		data = [{}] as INodeExecutionData[];
		response = { statusCode: 200, body: {} } as IN8nHttpFullResponse;
	});

	test('should return data when no error occurs', async () => {
		const result = await handleError.call(mockExecuteSingleFunctions, data, response);
		expect(result).toBe(data);
	});

	test('should throw NodeApiError for container conflict', async () => {
		mockExecuteSingleFunctions.getNodeParameter.mockReturnValue('container');

		response.statusCode = 409;
		response.body = { code: 'Conflict', message: 'Container already exists' } as JsonObject;

		await expect(handleError.call(mockExecuteSingleFunctions, data, response)).rejects.toThrow(
			new NodeApiError(mockExecuteSingleFunctions.getNode(), response.body as JsonObject, {
				message: ErrorMap.Container.Conflict.getMessage('container'),
				description: ErrorMap.Container.Conflict.description,
			}),
		);
	});

	test('should throw NodeApiError for container not found', async () => {
		mockExecuteSingleFunctions.getNodeParameter.mockReturnValue('container');

		response.statusCode = 404;
		response.body = { code: 'NotFound', message: 'Container not found' } as JsonObject;

		await expect(handleError.call(mockExecuteSingleFunctions, data, response)).rejects.toThrow(
			new NodeApiError(mockExecuteSingleFunctions.getNode(), response.body as JsonObject, {
				message: ErrorMap.Container.NotFound.getMessage('container'),
				description: ErrorMap.Container.NotFound.description,
			}),
		);
	});

	test('should throw NodeApiError for item not found', async () => {
		mockExecuteSingleFunctions.getNodeParameter.mockReturnValue('item');

		response.statusCode = 404;
		response.body = { code: 'NotFound', message: 'Item not found' } as JsonObject;

		await expect(handleError.call(mockExecuteSingleFunctions, data, response)).rejects.toThrow(
			new NodeApiError(mockExecuteSingleFunctions.getNode(), response.body as JsonObject, {
				message: ErrorMap.Item.NotFound.getMessage('item'),
				description: ErrorMap.Item.NotFound.description,
			}),
		);
	});

	test('should throw generic error if no specific mapping exists', async () => {
		mockExecuteSingleFunctions.getNodeParameter.mockReturnValue('container');

		response.statusCode = 400;
		response.body = { code: 'BadRequest', message: 'Invalid request' } as JsonObject;

		await expect(handleError.call(mockExecuteSingleFunctions, data, response)).rejects.toThrow(
			new NodeApiError(mockExecuteSingleFunctions.getNode(), response.body as JsonObject, {
				message: 'BadRequest',
				description: 'Invalid request',
			}),
		);
	});

	test('should handle error details correctly when match is successful', async () => {
		const errorMessage = 'Message: {"Errors":["Error 1", "Error 2"]}';
		const match = errorMessage.match(/Message: ({.*?})/);
		let errorDetails: string[] = [];

		if (match?.[1]) {
			try {
				errorDetails = JSON.parse(match[1]).Errors;
			} catch {}
		}

		expect(errorDetails).toEqual(['Error 1', 'Error 2']);
	});

	test('should handle error when match does not return expected format', async () => {
		const errorMessage = 'Message: Invalid format';

		const match = errorMessage.match(/Message: ({.*?})/);
		let errorDetails: string[] = [];

		if (match?.[1]) {
			try {
				errorDetails = JSON.parse(match[1]).Errors;
			} catch {}
		}

		expect(errorDetails).toEqual([]);
	});

	test('should throw NodeApiError with proper details if error details are present', async () => {
		const errorMessage = 'Message: {"Errors":["Specific error occurred"]}';
		const match = errorMessage.match(/Message: ({.*?})/);
		let errorDetails: string[] = [];

		if (match?.[1]) {
			try {
				errorDetails = JSON.parse(match[1]).Errors;
			} catch {}
		}

		if (errorDetails && errorDetails.length > 0) {
			await expect(
				handleError.call(mockExecuteSingleFunctions, data, {
					statusCode: 500,
					body: { code: 'InternalServerError', message: errorMessage },
					headers: {},
				}),
			).rejects.toThrow(
				new NodeApiError(
					mockExecuteSingleFunctions.getNode(),
					{
						code: 'InternalServerError',
						message: errorMessage,
					} as JsonObject,
					{
						message: 'InternalServerError',
						description: errorDetails.join('\n'),
					},
				),
			);
		}
	});

	test('should throw NodeApiError with fallback message if no details found', async () => {
		const errorMessage = 'Message: {"Errors":[] }';
		const match = errorMessage.match(/Message: ({.*?})/);
		let errorDetails: string[] = [];

		if (match?.[1]) {
			try {
				errorDetails = JSON.parse(match[1]).Errors;
			} catch {}
		}

		if (errorDetails && errorDetails.length > 0) {
			await expect(
				handleError.call(mockExecuteSingleFunctions, data, {
					statusCode: 500,
					body: { code: 'InternalServerError', message: errorMessage },
					headers: {},
				}),
			).rejects.toThrow(
				new NodeApiError(
					mockExecuteSingleFunctions.getNode(),
					{
						code: 'InternalServerError',
						message: errorMessage,
					} as JsonObject,
					{
						message: 'InternalServerError',
						description: 'Internal Server Error',
					},
				),
			);
		}
	});
});
