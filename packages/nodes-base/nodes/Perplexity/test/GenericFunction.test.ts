import type {
	IExecuteSingleFunctions,
	IN8nHttpFullResponse,
	INodeExecutionData,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { sendErrorPostReceive } from '../GenericFunctions';

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
						'The selected model is not valid. Valid models are: sonar, sonar-pro, sonar-deep-research, sonar-reasoning-pro. See https://docs.perplexity.ai/guides/model-cards for details.',
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
});
