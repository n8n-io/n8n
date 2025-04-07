import type {
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	ICredentialDataDecryptedObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { sendErrorPostReceive, getModels, getBaseUrl } from '../GenericFunctions';

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

	describe('getBaseUrl', () => {
		it('should return the base URL without trailing slash', () => {
			const credentials = {
				baseUrl: 'https://api.perplexity.ai/',
			} as ICredentialDataDecryptedObject;
			const result = getBaseUrl(credentials);
			expect(result).toBe('https://api.perplexity.ai');
		});

		it('should return the default base URL if baseUrl is not provided', () => {
			const credentials = {} as ICredentialDataDecryptedObject;
			const result = getBaseUrl(credentials);
			expect(result).toBe('https://api.perplexity.ai');
		});

		it('should handle case where baseUrl has no trailing slash', () => {
			const credentials = {
				baseUrl: 'https://api.perplexity.ai',
			} as ICredentialDataDecryptedObject;
			const result = getBaseUrl(credentials);
			expect(result).toBe('https://api.perplexity.ai');
		});
	});
});
