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
			new NodeApiError(
				mockExecuteSingleFunctions.getNode(),
				response.body as JsonObject,
				ErrorMap.Container.Conflict,
			),
		);
	});

	test('should throw NodeApiError for container not found', async () => {
		mockExecuteSingleFunctions.getNodeParameter.mockReturnValue('container');

		response.statusCode = 404;
		response.body = { code: 'NotFound', message: 'Container not found' } as JsonObject;

		await expect(handleError.call(mockExecuteSingleFunctions, data, response)).rejects.toThrow(
			new NodeApiError(
				mockExecuteSingleFunctions.getNode(),
				response.body as JsonObject,
				ErrorMap.Container.NotFound,
			),
		);
	});

	test('should throw NodeApiError for item not found', async () => {
		mockExecuteSingleFunctions.getNodeParameter.mockReturnValue('item');

		response.statusCode = 404;
		response.body = { code: 'NotFound', message: 'Item not found' } as JsonObject;

		await expect(handleError.call(mockExecuteSingleFunctions, data, response)).rejects.toThrow(
			new NodeApiError(
				mockExecuteSingleFunctions.getNode(),
				response.body as JsonObject,
				ErrorMap.Item.NotFound,
			),
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
});
