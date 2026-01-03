import type {
	IExecuteSingleFunctions,
	IN8nHttpFullResponse,
	INodeExecutionData,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import {
	sendErrorPostReceive,
	validateModelParameters,
	processProSearchResponse,
} from '../GenericFunctions';

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

		it('should throw NodeApiError with "Invalid model selected" message if error type is invalid_model', async () => {
			const errorResponse = {
				statusCode: 400,
				body: {
					error: {
						type: 'invalid_model',
						message: 'Invalid model type provided',
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
					message: 'Invalid model selected',
					description:
						'The selected model is not valid. Valid models are: sonar, sonar-pro, sonar-deep-research, sonar-reasoning-pro. See https://docs.perplexity.ai/getting-started/models for details.',
				}),
			);
		});

		it('should throw NodeApiError with error message if error type is invalid_request_error', async () => {
			const errorResponse = {
				statusCode: 400,
				body: {
					error: {
						type: 'invalid_request_error',
						message: 'Invalid parameter provided',
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
					message: 'Invalid parameter provided.',
					description:
						'Please check your message format and parameters. For Chat Completions API documentation, see: https://docs.perplexity.ai/api-reference/chat-completions-post',
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
					message: 'Invalid model selected [Item 0]',
					description:
						'The selected model is not valid. Valid models are: sonar, sonar-pro, sonar-deep-research, sonar-reasoning-pro. See https://docs.perplexity.ai/getting-started/models for details.',
				}),
			);
		});

		it('should handle error with non-string message', async () => {
			const errorResponse = {
				statusCode: 400,
				statusMessage: 'Bad Request',
				body: {
					error: {
						type: 'invalid_request_error',
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
					message: 'Bad Request.',
					description:
						'Please check your message format and parameters. For Chat Completions API documentation, see: https://docs.perplexity.ai/api-reference/chat-completions-post',
				}),
			);
		});

		it('should throw generic error for unknown error type', async () => {
			const errorResponse = {
				statusCode: 500,
				statusMessage: 'Internal Server Error',
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
					message: 'Internal server error.',
					description:
						'Please check your message format and parameters. For Chat Completions API documentation, see: https://docs.perplexity.ai/api-reference/chat-completions-post',
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

	describe('validateModelParameters', () => {
		it('should not throw error for valid parameters', () => {
			const params = {
				model: 'sonar-deep-research',
				reasoningEffort: 'high',
				stream: true,
			};

			expect(() => {
				validateModelParameters.call(mockExecuteSingleFunctions, params);
			}).not.toThrow();
		});

		it('should throw error when reasoningEffort is used with non-deep-research model', () => {
			const params = {
				model: 'sonar-pro',
				reasoningEffort: 'high',
			};

			expect(() => {
				validateModelParameters.call(mockExecuteSingleFunctions, params);
			}).toThrow(NodeOperationError);
		});

		it('should throw error when Pro Search is used without streaming', () => {
			const params = {
				model: 'sonar-pro',
				webSearchOptions: { searchType: 'pro' },
				stream: false,
			};

			expect(() => {
				validateModelParameters.call(mockExecuteSingleFunctions, params);
			}).toThrow(NodeOperationError);
		});

		it('should not throw error when Pro Search is used with streaming', () => {
			const params = {
				model: 'sonar-pro',
				webSearchOptions: { searchType: 'pro' },
				stream: true,
			};

			expect(() => {
				validateModelParameters.call(mockExecuteSingleFunctions, params);
			}).not.toThrow();
		});
	});

	describe('processProSearchResponse', () => {
		let testResponse: IN8nHttpFullResponse;

		beforeEach(() => {
			testResponse = { statusCode: 200, headers: {}, body: {} };
		});

		it('should pass through non-streaming response unchanged', async () => {
			const testData: INodeExecutionData[] = [
				{
					json: {
						id: 'test-123',
						model: 'sonar-pro',
						object: 'chat.completion',
						choices: [{ message: { role: 'assistant', content: 'Hello' } }],
					},
				},
			];

			const result = await processProSearchResponse.call(
				mockExecuteSingleFunctions,
				testData,
				testResponse,
			);

			expect(result[0].json).toEqual(testData[0].json);
		});

		it('should parse SSE string with single chunk', async () => {
			const sseString =
				'data: {"id":"123","model":"sonar-pro","object":"chat.completion.chunk","choices":[{"delta":{"content":"Hello"}}]}\r\n\r\n';
			const testData: INodeExecutionData[] = [
				{ json: sseString as unknown as INodeExecutionData['json'] },
			];

			const result = await processProSearchResponse.call(
				mockExecuteSingleFunctions,
				testData,
				testResponse,
			);

			expect(result[0].json).toHaveProperty('id', '123');
			expect(result[0].json).toHaveProperty('choices');
			const resultJson = result[0].json as { choices: Array<{ message: { content: string } }> };
			expect(resultJson.choices[0].message.content).toBe('Hello');
		});

		it('should accumulate content from multiple SSE chunks', async () => {
			const sseString =
				'data: {"id":"123","model":"sonar-pro","object":"chat.completion.chunk","choices":[{"delta":{"content":"Hello"}}]}\r\n\r\n' +
				'data: {"id":"123","model":"sonar-pro","object":"chat.completion.chunk","choices":[{"delta":{"content":" world"}}]}\r\n\r\n';
			const testData: INodeExecutionData[] = [
				{ json: sseString as unknown as INodeExecutionData['json'] },
			];

			const result = await processProSearchResponse.call(
				mockExecuteSingleFunctions,
				testData,
				testResponse,
			);

			const resultJson = result[0].json as { choices: Array<{ message: { content: string } }> };
			expect(resultJson.choices[0].message.content).toBe('Hello world');
		});

		it('should extract reasoning steps from chat.reasoning chunks', async () => {
			const sseString =
				'data: {"id":"123","model":"sonar-pro","object":"chat.reasoning","choices":[{"delta":{"reasoning_steps":[{"thought":"Searching","type":"web_search"}]}}]}\r\n\r\n';
			const testData: INodeExecutionData[] = [
				{ json: sseString as unknown as INodeExecutionData['json'] },
			];

			const result = await processProSearchResponse.call(
				mockExecuteSingleFunctions,
				testData,
				testResponse,
			);

			const resultJson = result[0].json as {
				choices: Array<{ message: { reasoning_steps: unknown[] } }>;
			};
			expect(resultJson.choices[0].message.reasoning_steps).toHaveLength(1);
		});

		it('should extract search results from reasoning steps', async () => {
			const sseString =
				'data: {"id":"123","model":"sonar-pro","object":"chat.reasoning","choices":[{"delta":{"reasoning_steps":[{"thought":"Searching","type":"web_search","web_search":{"search_results":[{"title":"Test","url":"http://test.com"}]}}]}}]}\r\n\r\n';
			const testData: INodeExecutionData[] = [
				{ json: sseString as unknown as INodeExecutionData['json'] },
			];

			const result = await processProSearchResponse.call(
				mockExecuteSingleFunctions,
				testData,
				testResponse,
			);

			const resultJson = result[0].json as { search_results: unknown[] };
			expect(resultJson.search_results).toHaveLength(1);
		});

		it('should skip malformed SSE chunks', async () => {
			const sseString =
				'data: {"id":"123","object":"chat.completion.chunk","choices":[{"delta":{"content":"Good"}}]}\r\n\r\n' +
				'data: {invalid json}\r\n\r\n' +
				'data: [DONE]\r\n\r\n';
			const testData: INodeExecutionData[] = [
				{ json: sseString as unknown as INodeExecutionData['json'] },
			];

			const result = await processProSearchResponse.call(
				mockExecuteSingleFunctions,
				testData,
				testResponse,
			);

			const resultJson = result[0].json as { choices: Array<{ message: { content: string } }> };
			expect(resultJson.choices[0].message.content).toBe('Good');
		});

		it('should handle empty SSE string', async () => {
			const testData: INodeExecutionData[] = [
				{ json: '' as unknown as INodeExecutionData['json'] },
			];

			const result = await processProSearchResponse.call(
				mockExecuteSingleFunctions,
				testData,
				testResponse,
			);

			expect(result[0].json).toBe('');
		});
	});
});
