import type {
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
	IN8nHttpFullResponse,
	INodeExecutionData,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { sendErrorPostReceive, getModels } from '../GenericFunctions';

// Mock implementation for `this` in `sendErrorPostReceive`
const mockExecuteSingleFunctions = {
	getNode: () => ({
		name: 'Mock Node',
		type: 'mock-type',
		position: [0, 0],
	}),
} as unknown as IExecuteSingleFunctions;

describe('Generic Functions', () => {
	describe('sendErrorPostReceive', () => {
		let testData: INodeExecutionData[];
		let testResponse: IN8nHttpFullResponse;

		beforeEach(() => {
			testData = [{ json: {} }];
			testResponse = { statusCode: 200, headers: {}, body: {} };
		});

		it('should return data if status code is not 4xx or 5xx', async () => {
			const result = await sendErrorPostReceive.call(
				mockExecuteSingleFunctions,
				testData,
				testResponse,
			);
			expect(result).toEqual(testData);
		});

		it('should throw NodeApiError if status code is 4xx', async () => {
			testResponse.statusCode = 400;
			await expect(
				sendErrorPostReceive.call(mockExecuteSingleFunctions, testData, testResponse),
			).rejects.toThrow(NodeApiError);
		});

		it('should throw NodeApiError if status code is 5xx', async () => {
			testResponse.statusCode = 500;
			await expect(
				sendErrorPostReceive.call(mockExecuteSingleFunctions, testData, testResponse),
			).rejects.toThrow(NodeApiError);
		});

		it('should throw NodeApiError with "Invalid model" message if error type is invalid_model', async () => {
			const errorResponse = {
				statusCode: 400,
				body: {
					error: {
						type: 'invalid_model',
						message: 'Invalid model type provided.',
					},
				},
			};

			await expect(
				sendErrorPostReceive.call(
					mockExecuteSingleFunctions,
					testData,
					errorResponse as unknown as IN8nHttpFullResponse,
				),
			).rejects.toThrowError(
				new NodeApiError(mockExecuteSingleFunctions.getNode(), errorResponse.body, {
					message: 'Invalid model',
					description:
						'The model is not valid. Permitted models can be found in the documentation at https://docs.perplexity.ai/guides/model-cards.',
				}),
			);
		});

		it('should throw NodeApiError with "Invalid parameter" message if error type is invalid_parameter', async () => {
			const errorResponse = {
				statusCode: 400,
				body: {
					error: {
						type: 'invalid_parameter',
						message: 'Invalid parameter provided.',
					},
				},
			};

			await expect(
				sendErrorPostReceive.call(
					mockExecuteSingleFunctions,
					testData,
					errorResponse as unknown as IN8nHttpFullResponse,
				),
			).rejects.toThrowError(
				new NodeApiError(mockExecuteSingleFunctions.getNode(), errorResponse.body, {
					message: 'invalid_parameter Invalid parameter provided.',
					description:
						'Please check all input parameters and ensure they are correctly formatted. Valid values can be found in the documentation at https://docs.perplexity.ai/api-reference/chat-completions.',
				}),
			);
		});

		it('should handle "invalid_model" error with itemIndex', async () => {
			const errorResponse = {
				statusCode: 400,
				body: {
					error: {
						type: 'invalid_model',
						message: 'Invalid model',
						itemIndex: 0,
					},
				},
			};

			await expect(
				sendErrorPostReceive.call(
					mockExecuteSingleFunctions,
					testData,
					errorResponse as unknown as IN8nHttpFullResponse,
				),
			).rejects.toThrowError(
				new NodeApiError(mockExecuteSingleFunctions.getNode(), errorResponse.body, {
					message: 'Invalid model',
					description: 'Permitted models documentation...',
				}),
			);
		});

		it('should handle "invalid_parameter" error with non-string message', async () => {
			const errorResponse = {
				statusCode: 400,
				body: {
					error: {
						type: 'invalid_parameter',
						message: { detail: 'Invalid param' },
					},
				},
			};

			await expect(
				sendErrorPostReceive.call(
					mockExecuteSingleFunctions,
					testData,
					errorResponse as unknown as IN8nHttpFullResponse,
				),
			).rejects.toThrowError(
				new NodeApiError(mockExecuteSingleFunctions.getNode(), errorResponse.body, {
					message: 'invalid_parameter An unexpected issue occurred',
					description: 'Please check parameters...',
				}),
			);
		});

		it('should throw generic error for unknown error type', async () => {
			const errorResponse = {
				statusCode: 500,
				body: {
					error: {
						type: 'server_error',
						message: 'Internal server error',
					},
				},
			};

			await expect(
				sendErrorPostReceive.call(
					mockExecuteSingleFunctions,
					testData,
					errorResponse as unknown as IN8nHttpFullResponse,
				),
			).rejects.toThrowError(
				new NodeApiError(mockExecuteSingleFunctions.getNode(), errorResponse.body, {
					message: 'Internal server error .',
					description: 'Refer to API documentation...',
				}),
			);
		});

		it('should include itemIndex in error message when present', async () => {
			const errorResponse = {
				statusCode: 400,
				body: {
					error: {
						type: 'other_error',
						message: 'Error with item',
						itemIndex: 2,
					},
				},
			};

			await expect(
				sendErrorPostReceive.call(
					mockExecuteSingleFunctions,
					testData,
					errorResponse as unknown as IN8nHttpFullResponse,
				),
			).rejects.toThrowError(
				new NodeApiError(mockExecuteSingleFunctions.getNode(), errorResponse.body, {
					message: 'Error with item [Item 2].',
				}),
			);
		});
	});

	describe('getModels', () => {
		it('should return all models if no filter is provided', async () => {
			const result = await getModels.call({} as ILoadOptionsFunctions);
			expect(result.results.length).toBeGreaterThan(0);
			expect(result.results).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ name: 'R1-1776', value: 'r1-1776' }),
					expect.objectContaining({ name: 'Sonar', value: 'sonar' }),
				]),
			);
		});

		it('should return filtered models if a filter is provided', async () => {
			const filter = 'sonar';
			const result = await getModels.call({} as ILoadOptionsFunctions, filter);
			expect(result.results.length).toBeGreaterThan(0);
			expect(result.results).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ name: 'Sonar', value: 'sonar' }),
					expect.objectContaining({ name: 'Sonar Deep Research', value: 'sonar-deep-research' }),
				]),
			);
		});

		it('should return an empty array if no models match the filter', async () => {
			const filter = 'nonexistent';
			const result = await getModels.call({} as ILoadOptionsFunctions, filter);
			expect(result.results).toEqual([]);
		});
	});
});
