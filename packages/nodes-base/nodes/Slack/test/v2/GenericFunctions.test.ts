import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError, sleep } from 'n8n-workflow';

import {
	slackApiRequest,
	slackApiRequestAllItems,
	slackApiRequestAllItemsWithRateLimit,
	processThreadOptions,
	getMessageContent,
} from '../../V2/GenericFunctions';

jest.mock('n8n-workflow', () => ({
	...jest.requireActual('n8n-workflow'),
	NodeApiError: jest.fn(),
	sleep: jest.fn().mockResolvedValue(undefined),
}));

describe('Slack V2 > GenericFunctions', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;

	beforeEach(() => {
		jest.clearAllMocks();
		mockExecuteFunctions = {
			helpers: {
				requestWithAuthentication: jest.fn(),
			},
			getNode: jest.fn().mockReturnValue({ type: 'n8n-nodes-base.slack', typeVersion: 2 }),
			getNodeParameter: jest.fn().mockReturnValue('accessToken'),
			getWorkflow: jest.fn().mockReturnValue({ id: 'workflow-123', active: true }),
			getInstanceBaseUrl: jest.fn().mockReturnValue('https://test.n8n.io/'),
			getInstanceId: jest.fn().mockReturnValue('instance-123'),
		} as unknown as jest.Mocked<IExecuteFunctions>;
	});

	describe('slackApiRequest', () => {
		it('should handle paid_teams_only error', async () => {
			const mockResponse = { ok: false, error: 'paid_teams_only' };
			mockExecuteFunctions.helpers.requestWithAuthentication = jest
				.fn()
				.mockResolvedValue(mockResponse);

			await expect(slackApiRequest.call(mockExecuteFunctions, 'GET', '/test')).rejects.toThrow();
		});

		it('should not handle paid_teams_only error if simple:false', async () => {
			const mockResponse = { ok: false, error: 'paid_teams_only' };
			mockExecuteFunctions.helpers.requestWithAuthentication = jest
				.fn()
				.mockResolvedValue(mockResponse);

			await expect(
				slackApiRequest.call(mockExecuteFunctions, 'GET', '/test', {}, {}, {}, { simple: false }),
			).resolves.toEqual(mockResponse);
		});

		it('should handle missing_scope error with needed scopes', async () => {
			const mockResponse = {
				ok: false,
				error: 'missing_scope',
				needed: 'channels:read,users:read',
			};
			mockExecuteFunctions.helpers.requestWithAuthentication = jest
				.fn()
				.mockResolvedValue(mockResponse);

			// Test that the function throws the correct error type and message
			// Using .rejects ensures the test fails if slackApiRequest doesn't throw
			await expect(slackApiRequest.call(mockExecuteFunctions, 'GET', '/test')).rejects.toThrow(
				NodeOperationError,
			);
			await expect(slackApiRequest.call(mockExecuteFunctions, 'GET', '/test')).rejects.toThrow(
				'Your Slack credential is missing required Oauth Scopes',
			);

			// Test specific error properties by catching the thrown error
			await expect(
				slackApiRequest.call(mockExecuteFunctions, 'GET', '/test'),
			).rejects.toMatchObject({
				description: 'Add the following scope(s) to your Slack App: channels:read,users:read',
				level: 'warning',
			});
		});

		it('should handle missing_scope error without needed scopes', async () => {
			const mockResponse = {
				ok: false,
				error: 'missing_scope',
			};
			mockExecuteFunctions.helpers.requestWithAuthentication = jest
				.fn()
				.mockResolvedValue(mockResponse);

			await expect(slackApiRequest.call(mockExecuteFunctions, 'GET', '/test')).rejects.toThrow(
				NodeOperationError,
			);

			// Test detailed error properties
			try {
				await slackApiRequest.call(mockExecuteFunctions, 'GET', '/test');
				throw new Error('Expected slackApiRequest to throw');
			} catch (error) {
				if (error.message === 'Expected slackApiRequest to throw') {
					throw error; // Re-throw our custom error if the function didn't throw as expected
				}
				expect(error).toBeInstanceOf(NodeOperationError);
				expect(error.message).toBe('Your Slack credential is missing required Oauth Scopes');
				expect(error.description).toBe('Add the following scope(s) to your Slack App: undefined');
				expect(error.level).toBe('warning');
			}
		});

		it('should handle not_admin error', async () => {
			const mockResponse = { ok: false, error: 'not_admin' };
			mockExecuteFunctions.helpers.requestWithAuthentication = jest
				.fn()
				.mockResolvedValue(mockResponse);

			await expect(slackApiRequest.call(mockExecuteFunctions, 'GET', '/test')).rejects.toThrow(
				NodeOperationError,
			);

			try {
				await slackApiRequest.call(mockExecuteFunctions, 'GET', '/test');
			} catch (error) {
				expect(error).toBeInstanceOf(NodeOperationError);
				expect(error.message).toBe(
					'Need higher Role Level for this Operation (e.g. Owner or Admin Rights)',
				);
				expect(error.description).toBe(
					'Hint: Check the Role of your Slack App Integration. For more information see the Slack Documentation - https://slack.com/help/articles/360018112273-Types-of-roles-in-Slack',
				);
				expect(error.level).toBe('warning');
			}
		});

		it('should handle generic error responses', async () => {
			const mockResponse = { ok: false, error: 'some_other_error' };
			mockExecuteFunctions.helpers.requestWithAuthentication = jest
				.fn()
				.mockResolvedValue(mockResponse);

			await expect(slackApiRequest.call(mockExecuteFunctions, 'GET', '/test')).rejects.toThrow(
				NodeOperationError,
			);

			try {
				await slackApiRequest.call(mockExecuteFunctions, 'GET', '/test');
			} catch (error) {
				expect(error).toBeInstanceOf(NodeOperationError);
				expect(error.message).toBe('Slack error response: "some_other_error"');
			}
		});

		it('should add message_timestamp and remove ts when response contains ts', async () => {
			const mockResponse = {
				ok: true,
				ts: '1234567890.123456',
				message: 'Test message',
			};
			mockExecuteFunctions.helpers.requestWithAuthentication = jest
				.fn()
				.mockResolvedValue(mockResponse);

			const result = await slackApiRequest.call(mockExecuteFunctions, 'GET', '/test');

			expect(result).toEqual({
				ok: true,
				message_timestamp: '1234567890.123456',
				message: 'Test message',
			});
			expect(result.ts).toBeUndefined();
		});

		it('should not modify response when ts is not present', async () => {
			const mockResponse = {
				ok: true,
				message: 'Test message',
			};
			mockExecuteFunctions.helpers.requestWithAuthentication = jest
				.fn()
				.mockResolvedValue(mockResponse);

			const result = await slackApiRequest.call(mockExecuteFunctions, 'GET', '/test');

			expect(result).toEqual({
				ok: true,
				message: 'Test message',
			});
			expect(result.message_timestamp).toBeUndefined();
		});
	});

	describe('slackApiRequestAllItems', () => {
		it('should use default limit of 100 when no limit is provided', async () => {
			const mockResponse = {
				ok: true,
				channels: [{ id: 'ch1' }],
				response_metadata: { next_cursor: undefined },
			};

			mockExecuteFunctions.helpers.requestWithAuthentication = jest
				.fn()
				.mockResolvedValue(mockResponse);

			await slackApiRequestAllItems.bind(mockExecuteFunctions)(
				'channels',
				'GET',
				'conversations.list',
			);

			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'slackApi',
				expect.objectContaining({
					headers: expect.any(Object),
					qs: {
						limit: 100,
						page: 2,
						cursor: undefined,
					},
					json: true,
					method: 'GET',
					uri: expect.any(String),
				}),
				expect.any(Object),
			);
		});

		it('should use provided limit value when specified', async () => {
			const mockResponse = {
				ok: true,
				channels: [{ id: 'ch1' }],
				response_metadata: { next_cursor: undefined },
			};

			mockExecuteFunctions.helpers.requestWithAuthentication = jest
				.fn()
				.mockResolvedValue(mockResponse);

			await slackApiRequestAllItems.call(
				mockExecuteFunctions,
				'channels',
				'GET',
				'conversations.list',
				{},
				{ limit: 50 },
			);

			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'slackApi',
				expect.objectContaining({
					headers: expect.any(Object),
					qs: {
						limit: 50,
						page: 2,
						cursor: undefined,
					},
					json: true,
					method: 'GET',
					uri: expect.any(String),
				}),
				expect.any(Object),
			);
		});

		it('should use count instead of limit for files.list endpoint', async () => {
			const mockResponse = {
				ok: true,
				files: [{ id: 'file1' }],
				response_metadata: { next_cursor: undefined },
			};

			mockExecuteFunctions.helpers.requestWithAuthentication = jest
				.fn()
				.mockResolvedValue(mockResponse);

			await slackApiRequestAllItems.call(mockExecuteFunctions, 'files', 'GET', 'files.list');

			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'slackApi',
				expect.objectContaining({
					headers: expect.any(Object),
					qs: {
						count: 100,
						page: 2,
						cursor: undefined,
					},
					json: true,
					method: 'GET',
					uri: expect.any(String),
				}),
				expect.any(Object),
			);
		});

		it('should handle files.list pagination', async () => {
			const responses = [
				{
					ok: true,
					files: [{ id: '1' }],
					response_metadata: { next_cursor: 'cursor1' },
				},
				{
					ok: true,
					files: [{ id: '2' }],
					response_metadata: { next_cursor: '' },
				},
			];

			mockExecuteFunctions.helpers.requestWithAuthentication = jest
				.fn()
				.mockImplementationOnce(() => responses[0])
				.mockImplementationOnce(() => responses[1]);

			const result = await slackApiRequestAllItems.call(
				mockExecuteFunctions,
				'files',
				'GET',
				'files.list',
			);

			expect(result).toEqual([{ id: '1' }, { id: '2' }]);
			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledTimes(2);
		});

		it('should handle regular pagination with paging info', async () => {
			const responses = [
				{
					ok: true,
					channels: [{ id: 'ch1' }],
					paging: { pages: 2, page: 1 },
				},
				{
					ok: true,
					channels: [{ id: 'ch2' }],
					paging: { pages: 2, page: 2 },
				},
			];

			mockExecuteFunctions.helpers.requestWithAuthentication = jest
				.fn()
				.mockImplementationOnce(() => responses[0])
				.mockImplementationOnce(() => responses[1]);

			const result = await slackApiRequestAllItems.call(
				mockExecuteFunctions,
				'channels',
				'GET',
				'conversations.list',
			);

			expect(result).toEqual([{ id: 'ch1' }, { id: 'ch2' }]);
		});

		it('should handle matches in response', async () => {
			const response = {
				ok: true,
				messages: {
					matches: [{ text: 'test' }],
				},
				response_metadata: { next_cursor: '' },
			};

			mockExecuteFunctions.helpers.requestWithAuthentication = jest
				.fn()
				.mockResolvedValue(response);

			const result = await slackApiRequestAllItems.call(
				mockExecuteFunctions,
				'messages',
				'GET',
				'search.messages',
			);

			expect(result).toEqual([{ text: 'test' }]);
		});
	});

	describe('slackApiRequestAllItemsWithRateLimit', () => {
		beforeEach(() => {
			jest.clearAllMocks();
			(sleep as jest.Mock).mockResolvedValue(undefined);
		});

		it('should paginate successfully without rate limits', async () => {
			const responses = [
				{
					statusCode: 200,
					body: {
						ok: true,
						channels: [{ id: 'ch1' }],
						response_metadata: { next_cursor: 'cursor1' },
					},
				},
				{
					statusCode: 200,
					body: {
						ok: true,
						channels: [{ id: 'ch2' }],
						response_metadata: { next_cursor: '' },
					},
				},
			];

			mockExecuteFunctions.helpers.requestWithAuthentication = jest
				.fn()
				.mockImplementationOnce(() => responses[0])
				.mockImplementationOnce(() => responses[1]);

			const result = await slackApiRequestAllItemsWithRateLimit(
				mockExecuteFunctions,
				'channels',
				'GET',
				'conversations.list',
			);

			expect(result.data).toEqual([{ id: 'ch1' }, { id: 'ch2' }]);
			expect(sleep).not.toHaveBeenCalled();
		});

		it('should retry on 429 error with retry-after header', async () => {
			const rateLimitError = {
				statusCode: 429,
				body: {
					error: 'rate_limit_exceeded',
				},
				headers: {
					'retry-after': '2',
				},
			};

			const successResponse = {
				statusCode: 200,
				body: {
					ok: true,
					channels: [{ id: 'ch1' }],
					response_metadata: { next_cursor: '' },
				},
			};

			mockExecuteFunctions.helpers.requestWithAuthentication = jest
				.fn()
				.mockResolvedValueOnce(rateLimitError)
				.mockResolvedValueOnce(successResponse);

			const result = await slackApiRequestAllItemsWithRateLimit(
				mockExecuteFunctions,
				'channels',
				'GET',
				'conversations.list',
			);

			expect(result.data).toEqual([{ id: 'ch1' }]);
			expect(sleep).toHaveBeenCalledTimes(1);
			expect(sleep).toHaveBeenCalledWith(2000); // 2 seconds * 1000
		});

		it('should retry on 429 error with Retry-After header (capitalized)', async () => {
			const rateLimitError = {
				statusCode: 429,
				body: {
					error: 'rate_limit_exceeded',
				},
				headers: {
					'Retry-After': '5',
				},
			};

			const successResponse = {
				statusCode: 200,
				body: {
					ok: true,
					channels: [{ id: 'ch1' }],
					response_metadata: { next_cursor: '' },
				},
			};

			mockExecuteFunctions.helpers.requestWithAuthentication = jest
				.fn()
				.mockResolvedValueOnce(rateLimitError)
				.mockResolvedValueOnce(successResponse);

			const result = await slackApiRequestAllItemsWithRateLimit(
				mockExecuteFunctions,
				'channels',
				'GET',
				'conversations.list',
			);

			expect(result.data).toEqual([{ id: 'ch1' }]);
			expect(sleep).toHaveBeenCalledWith(5000); // 5 seconds * 1000
		});

		it('should use fallbackDelay when Retry-After header is missing', async () => {
			const rateLimitError = {
				statusCode: 429,
				body: {
					error: 'rate_limit_exceeded',
				},
				headers: {},
			};

			const successResponse = {
				statusCode: 200,
				body: {
					ok: true,
					channels: [{ id: 'ch1' }],
					response_metadata: { next_cursor: '' },
				},
			};

			mockExecuteFunctions.helpers.requestWithAuthentication = jest
				.fn()
				.mockResolvedValueOnce(rateLimitError)
				.mockResolvedValueOnce(successResponse);

			const result = await slackApiRequestAllItemsWithRateLimit(
				mockExecuteFunctions,
				'channels',
				'GET',
				'conversations.list',
				{},
				{},
				{ fallbackDelay: 10000 },
			);

			expect(result.data).toEqual([{ id: 'ch1' }]);
			expect(sleep).toHaveBeenCalledWith(10000);
		});

		it('should retry multiple times on consecutive 429 errors', async () => {
			const rateLimitError = {
				statusCode: 429,
				body: {
					error: 'rate_limit_exceeded',
				},
				headers: {
					'retry-after': '1',
				},
			};

			const successResponse = {
				statusCode: 200,
				body: {
					ok: true,
					channels: [{ id: 'ch1' }],
					response_metadata: { next_cursor: '' },
				},
			};

			mockExecuteFunctions.helpers.requestWithAuthentication = jest
				.fn()
				.mockResolvedValueOnce(rateLimitError)
				.mockResolvedValueOnce(rateLimitError)
				.mockResolvedValueOnce(successResponse);

			const result = await slackApiRequestAllItemsWithRateLimit(
				mockExecuteFunctions,
				'channels',
				'GET',
				'conversations.list',
				{},
				{},
				{ maxRetries: 3 },
			);

			expect(result.data).toEqual([{ id: 'ch1' }]);
			expect(sleep).toHaveBeenCalledTimes(2);
			expect(sleep).toHaveBeenNthCalledWith(1, 1000);
			expect(sleep).toHaveBeenNthCalledWith(2, 1000);
		});

		it('should throw error when maxRetries exceeded with onFail: throw (default)', async () => {
			const rateLimitError = {
				statusCode: 429,
				headers: {
					'retry-after': '1',
				},
				body: {
					error: 'rate_limit_exceeded',
				},
			};

			mockExecuteFunctions.helpers.requestWithAuthentication = jest
				.fn()
				.mockResolvedValue(rateLimitError);

			await expect(
				slackApiRequestAllItemsWithRateLimit(
					mockExecuteFunctions,
					'channels',
					'GET',
					'conversations.list',
					{},
					{},
					{ maxRetries: 2 },
				),
			).rejects.toThrow(/Slack error response: "rate_limit_exceeded"/);

			expect(sleep).toHaveBeenCalledTimes(2); // Should retry 2 times
		});

		it('should return partial data when maxRetries exceeded with onFail: stop', async () => {
			const rateLimitError = {
				statusCode: 429,
				body: {
					error: 'rate_limit_exceeded',
				},
				headers: {
					'retry-after': '1',
				},
			};

			const firstPageResponse = {
				statusCode: 200,
				body: {
					ok: true,
					channels: [{ id: 'ch1' }],
					response_metadata: { next_cursor: 'cursor1' },
				},
			};

			mockExecuteFunctions.helpers.requestWithAuthentication = jest
				.fn()
				.mockResolvedValue(rateLimitError)
				.mockResolvedValueOnce(firstPageResponse);

			const result = await slackApiRequestAllItemsWithRateLimit(
				mockExecuteFunctions,
				'channels',
				'GET',
				'conversations.list',
				{},
				{},
				{ maxRetries: 2, onFail: 'stop' },
			);

			expect(result.data).toEqual([{ id: 'ch1' }]);
			expect(result.cursor).toBe('cursor1');
			expect(sleep).toHaveBeenCalledTimes(3);
		});

		it('should return nextPage when using legacy pagination with onFail: stop', async () => {
			const rateLimitError = {
				statusCode: 429,
				body: {
					error: 'rate_limit_exceeded',
				},
				headers: {
					'retry-after': '1',
				},
			};

			const firstPageResponse = {
				statusCode: 200,
				body: {
					ok: true,
					channels: [{ id: 'ch1' }],
					paging: { pages: 3, page: 1 },
				},
			};

			mockExecuteFunctions.helpers.requestWithAuthentication = jest
				.fn()
				.mockResolvedValue(rateLimitError)
				.mockResolvedValueOnce(firstPageResponse);

			const result = await slackApiRequestAllItemsWithRateLimit(
				mockExecuteFunctions,
				'channels',
				'GET',
				'conversations.list',
				{},
				{},
				{ maxRetries: 1, onFail: 'stop' },
			);

			expect(result.data).toEqual([{ id: 'ch1' }]);
			// Returns the page from the last successful response (responseData.paging.page)
			expect(result.page).toBe('1');
		});

		it('should return nextPage from property paging when using onFail: stop', async () => {
			const rateLimitError = {
				statusCode: 429,
				body: {
					error: 'rate_limit_exceeded',
				},
				headers: {
					'retry-after': '1',
				},
			};

			const firstPageResponse = {
				statusCode: 200,
				body: {
					ok: true,
					messages: {
						matches: [{ text: 'msg1' }],
					},
					paging: { pages: 2, page: 1 },
				},
			};

			mockExecuteFunctions.helpers.requestWithAuthentication = jest
				.fn()
				.mockResolvedValue(rateLimitError)
				.mockResolvedValueOnce(firstPageResponse);

			const result = await slackApiRequestAllItemsWithRateLimit(
				mockExecuteFunctions,
				'messages',
				'GET',
				'search.messages',
				{},
				{},
				{ maxRetries: 1, onFail: 'stop' },
			);

			expect(result.data).toEqual([{ text: 'msg1' }]);
			// Returns the page from the last successful response (responseData[propertyName].paging.page)
			expect(result.page).toBe('1');
		});

		it('should handle rate limit in middle of pagination', async () => {
			const rateLimitError = {
				statusCode: 429,
				body: {
					error: 'rate_limit_exceeded',
				},
				headers: {
					'retry-after': '1',
				},
			};

			const responses = [
				{
					statusCode: 200,
					body: {
						ok: true,
						channels: [{ id: 'ch1' }],
						response_metadata: { next_cursor: 'cursor1' },
					},
				},
				rateLimitError,
				{
					statusCode: 200,
					body: {
						ok: true,
						channels: [{ id: 'ch2' }],
						response_metadata: { next_cursor: '' },
					},
				},
			];

			mockExecuteFunctions.helpers.requestWithAuthentication = jest
				.fn()
				.mockImplementationOnce(() => responses[0])
				.mockResolvedValueOnce(responses[1])
				.mockImplementationOnce(() => responses[2]);

			const result = await slackApiRequestAllItemsWithRateLimit(
				mockExecuteFunctions,
				'channels',
				'GET',
				'conversations.list',
			);

			expect(result.data).toEqual([{ id: 'ch1' }, { id: 'ch2' }]);
			expect(sleep).toHaveBeenCalledTimes(1);
		});

		it('should handle non-429 errors by throwing immediately', async () => {
			const otherError = {
				statusCode: 500,
				body: {
					error: 'Internal Server Error',
				},
			};

			mockExecuteFunctions.helpers.requestWithAuthentication = jest
				.fn()
				.mockResolvedValue(otherError);

			await expect(
				slackApiRequestAllItemsWithRateLimit(
					mockExecuteFunctions,
					'channels',
					'GET',
					'conversations.list',
				),
			).rejects.toThrow(/Slack error response: "Internal Server Error"/);

			expect(sleep).not.toHaveBeenCalled();
		});

		it('should use files.list endpoint with count parameter', async () => {
			const response = {
				statusCode: 200,
				body: {
					ok: true,
					files: [{ id: 'file1' }],
					response_metadata: { next_cursor: '' },
				},
			};

			mockExecuteFunctions.helpers.requestWithAuthentication = jest
				.fn()
				.mockResolvedValue(response);

			await slackApiRequestAllItemsWithRateLimit(
				mockExecuteFunctions,
				'files',
				'GET',
				'files.list',
			);

			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'slackApi',
				expect.objectContaining({
					qs: expect.objectContaining({
						count: 100,
					}),
				}),
				expect.any(Object),
			);
		});

		it('should handle pagination with paging info', async () => {
			const responses = [
				{
					statusCode: 200,
					body: {
						ok: true,
						channels: [{ id: 'ch1' }],
						paging: { pages: 2, page: 1 },
					},
				},
				{
					statusCode: 200,
					body: {
						ok: true,
						channels: [{ id: 'ch2' }],
						paging: { pages: 2, page: 2 },
					},
				},
			];

			mockExecuteFunctions.helpers.requestWithAuthentication = jest
				.fn()
				.mockImplementationOnce(() => responses[0])
				.mockImplementationOnce(() => responses[1]);

			const result = await slackApiRequestAllItemsWithRateLimit(
				mockExecuteFunctions,
				'channels',
				'GET',
				'conversations.list',
			);

			expect(result.data).toEqual([{ id: 'ch1' }, { id: 'ch2' }]);
		});

		it('should handle matches in response', async () => {
			const response = {
				statusCode: 200,
				body: {
					ok: true,
					messages: {
						matches: [{ text: 'test' }],
					},
					response_metadata: { next_cursor: '' },
				},
			};

			mockExecuteFunctions.helpers.requestWithAuthentication = jest
				.fn()
				.mockResolvedValue(response);

			const result = await slackApiRequestAllItemsWithRateLimit(
				mockExecuteFunctions,
				'messages',
				'GET',
				'search.messages',
			);

			expect(result.data).toEqual([{ text: 'test' }]);
		});

		it('should use default options when not provided', async () => {
			const rateLimitError = {
				statusCode: 429,
				body: {
					error: 'rate_limit_exceeded',
				},
				headers: {},
			};

			const successResponse = {
				statusCode: 200,
				body: {
					ok: true,
					channels: [{ id: 'ch1' }],
					response_metadata: { next_cursor: '' },
				},
			};

			mockExecuteFunctions.helpers.requestWithAuthentication = jest
				.fn()
				.mockResolvedValueOnce(rateLimitError)
				.mockResolvedValueOnce(successResponse);

			await slackApiRequestAllItemsWithRateLimit(
				mockExecuteFunctions,
				'channels',
				'GET',
				'conversations.list',
			);

			// Should use default fallbackDelay of 30000
			expect(sleep).toHaveBeenCalledWith(30000);
		});
	});

	describe('processThreadOptions', () => {
		it('should return empty object when threadOptions is undefined', () => {
			const result = processThreadOptions(undefined);
			expect(result).toEqual({});
		});

		it('should return empty object when threadOptions is null', () => {
			const result = processThreadOptions(null as any);
			expect(result).toEqual({});
		});

		it('should return empty object when threadOptions has no replyValues', () => {
			const threadOptions = { someOtherProperty: 'value' };
			const result = processThreadOptions(threadOptions);
			expect(result).toEqual({});
		});

		it('should return empty object when replyValues is empty', () => {
			const threadOptions = { replyValues: {} };
			const result = processThreadOptions(threadOptions);
			expect(result).toEqual({});
		});

		it('should extract and stringify thread_ts when provided', () => {
			const threadOptions = {
				replyValues: {
					thread_ts: 1709203825.689579,
				},
			};
			const result = processThreadOptions(threadOptions);
			expect(result).toEqual({
				thread_ts: '1709203825.689579',
			});
		});

		it('should extract reply_broadcast when provided', () => {
			const threadOptions = {
				replyValues: {
					reply_broadcast: true,
				},
			};
			const result = processThreadOptions(threadOptions);
			expect(result).toEqual({
				reply_broadcast: true,
			});
		});

		it('should extract both thread_ts and reply_broadcast when both provided', () => {
			const threadOptions = {
				replyValues: {
					thread_ts: 1709203825.689579,
					reply_broadcast: true,
				},
			};
			const result = processThreadOptions(threadOptions);
			expect(result).toEqual({
				thread_ts: '1709203825.689579',
				reply_broadcast: true,
			});
		});

		it('should handle reply_broadcast as false', () => {
			const threadOptions = {
				replyValues: {
					thread_ts: 1709203825.689579,
					reply_broadcast: false,
				},
			};
			const result = processThreadOptions(threadOptions);
			expect(result).toEqual({
				thread_ts: '1709203825.689579',
				reply_broadcast: false,
			});
		});

		it('should handle thread_ts as string', () => {
			const threadOptions = {
				replyValues: {
					thread_ts: '1709203825.689579',
					reply_broadcast: true,
				},
			};
			const result = processThreadOptions(threadOptions);
			expect(result).toEqual({
				thread_ts: '1709203825.689579',
				reply_broadcast: true,
			});
		});

		it('should ignore other properties in replyValues', () => {
			const threadOptions = {
				replyValues: {
					thread_ts: 1709203825.689579,
					reply_broadcast: true,
					someOtherProperty: 'ignored',
					anotherProperty: 123,
				},
			};
			const result = processThreadOptions(threadOptions);
			expect(result).toEqual({
				thread_ts: '1709203825.689579',
				reply_broadcast: true,
			});
		});

		it('should handle thread_ts as 0 (falsy but valid)', () => {
			const threadOptions = {
				replyValues: {
					thread_ts: 0,
					reply_broadcast: true,
				},
			};
			const result = processThreadOptions(threadOptions);
			expect(result).toEqual({
				reply_broadcast: true,
			});
		});

		it('should handle reply_broadcast as undefined (not included in result)', () => {
			const threadOptions = {
				replyValues: {
					thread_ts: 1709203825.689579,
					reply_broadcast: undefined,
				},
			};
			const result = processThreadOptions(threadOptions);
			expect(result).toEqual({
				thread_ts: '1709203825.689579',
			});
		});

		it('should handle complex nested structure matching n8n parameter format', () => {
			// This matches the actual structure from n8n workflow parameters
			const threadOptions = {
				replyValues: {
					thread_ts: 1709203825.689579,
					reply_broadcast: true,
				},
				someOtherNestedProperty: {
					value: 'ignored',
				},
			};
			const result = processThreadOptions(threadOptions);
			expect(result).toEqual({
				thread_ts: '1709203825.689579',
				reply_broadcast: true,
			});
		});
	});

	describe('getMessageContent', () => {
		beforeEach(() => {
			mockExecuteFunctions.getWorkflow.mockReturnValue({ id: 'workflow-123', active: true });
			mockExecuteFunctions.getInstanceBaseUrl.mockReturnValue('https://test.n8n.io/');
		});

		describe('block message type', () => {
			beforeEach(() => {
				(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
					(param: string, _index: number) => {
						const params: { [key: string]: any } = {
							messageType: 'block',
							'otherOptions.includeLinkToWorkflow': true,
							text: 'Fallback text',
						};
						return params[param] || undefined;
					},
				);
			});

			it('should handle block message type with includeLinkToWorkflow true', () => {
				const mockBlocksUI = {
					blocks: [
						{
							type: 'section',
							text: {
								type: 'mrkdwn',
								text: 'Hello World',
							},
						},
					],
				};

				(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
					(param: string, _index: number) => {
						if (param === 'messageType') return 'block';
						if (param === 'otherOptions.includeLinkToWorkflow') return true;
						if (param === 'text') return 'Fallback text';
						if (param === 'blocksUi') return mockBlocksUI;
						return undefined;
					},
				);

				const result = getMessageContent.call(mockExecuteFunctions, 0, 2.1, 'instance-123');

				expect((result as any).blocks).toHaveLength(2);
				expect((result as any).blocks[0]).toEqual({
					type: 'section',
					text: {
						type: 'mrkdwn',
						text: 'Hello World',
					},
				});
				expect((result as any).blocks[1]).toEqual({
					type: 'section',
					text: {
						type: 'mrkdwn',
						text: '_Automated with this <https://test.n8n.io/workflow/workflow-123?utm_source=n8n-internal&utm_medium=powered_by&utm_campaign=n8n-nodes-base.slack_instance-123|n8n workflow>_',
					},
				});
				expect(result.text).toBe('Fallback text');
			});

			it('should handle block message type with includeLinkToWorkflow false', () => {
				const mockBlocksUI = {
					blocks: [
						{
							type: 'section',
							text: {
								type: 'mrkdwn',
								text: 'Hello World',
							},
						},
					],
				};

				(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
					(param: string, _index: number) => {
						if (param === 'messageType') return 'block';
						if (param === 'otherOptions.includeLinkToWorkflow') return false;
						if (param === 'text') return 'Fallback text';
						if (param === 'blocksUi') return mockBlocksUI;
						return undefined;
					},
				);

				const result = getMessageContent.call(mockExecuteFunctions, 0, 2.1, 'instance-123');

				expect((result as any).blocks).toHaveLength(1);
				expect((result as any).blocks[0]).toEqual({
					type: 'section',
					text: {
						type: 'mrkdwn',
						text: 'Hello World',
					},
				});
				expect(result.text).toBe('Fallback text');
			});

			it('should handle block message type without instanceId', () => {
				const mockBlocksUI = {
					blocks: [
						{
							type: 'divider',
						},
					],
				};

				(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
					(param: string, _index: number) => {
						if (param === 'messageType') return 'block';
						if (param === 'otherOptions.includeLinkToWorkflow') return true;
						if (param === 'text') return '';
						if (param === 'blocksUi') return mockBlocksUI;
						return undefined;
					},
				);

				const result = getMessageContent.call(mockExecuteFunctions, 0, 2.1);

				expect((result as any).blocks).toHaveLength(2);
				expect((result as any).blocks[1].text.text).toBe(
					'_Automated with this <https://test.n8n.io/workflow/workflow-123?utm_source=n8n-internal&utm_medium=powered_by&utm_campaign=n8n-nodes-base.slack|n8n workflow>_',
				);
			});

			it('should handle block message type with non-array blocks', () => {
				const mockBlocksUI = {
					blocks: 'invalid-blocks-format',
				};

				(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
					(param: string, _index: number) => {
						if (param === 'messageType') return 'block';
						if (param === 'otherOptions.includeLinkToWorkflow') return true;
						if (param === 'text') return 'Test text';
						if (param === 'blocksUi') return mockBlocksUI;
						return undefined;
					},
				);

				const result = getMessageContent.call(mockExecuteFunctions, 0, 2.1, 'instance-123');

				expect(result).toEqual({
					blocks: 'invalid-blocks-format',
					text: 'Test text',
				});
			});

			it('should add text property when text parameter is provided', () => {
				const mockBlocksUI = {
					blocks: [],
				};

				(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
					(param: string, _index: number) => {
						if (param === 'messageType') return 'block';
						if (param === 'otherOptions.includeLinkToWorkflow') return false;
						if (param === 'text') return 'Custom fallback text';
						if (param === 'blocksUi') return mockBlocksUI;
						return undefined;
					},
				);

				const result = getMessageContent.call(mockExecuteFunctions, 0, 2.1, 'instance-123');

				expect(result.text).toBe('Custom fallback text');
				expect(result.blocks).toEqual([]);
			});

			it('should not add text property when text parameter is empty', () => {
				const mockBlocksUI = {
					blocks: [],
				};

				(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
					(param: string, _index: number) => {
						if (param === 'messageType') return 'block';
						if (param === 'otherOptions.includeLinkToWorkflow') return false;
						if (param === 'text') return '';
						if (param === 'blocksUi') return mockBlocksUI;
						return undefined;
					},
				);

				const result = getMessageContent.call(mockExecuteFunctions, 0, 2.1, 'instance-123');

				expect(result).toEqual({
					blocks: [],
				});
				expect(result.text).toBeUndefined();
			});
		});

		describe('attachment message type', () => {
			it('should handle attachment message type with includeLinkToWorkflow true', () => {
				const mockAttachments = [
					{
						color: 'good',
						text: 'Attachment text',
						fields: {
							item: [
								{ title: 'Field 1', value: 'Value 1' },
								{ title: 'Field 2', value: 'Value 2' },
							],
						},
					},
					{
						color: 'warning',
						title: 'Warning attachment',
					},
				];

				(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
					(param: string, _index: number) => {
						if (param === 'messageType') return 'attachment';
						if (param === 'otherOptions.includeLinkToWorkflow') return true;
						if (param === 'text') return '';
						if (param === 'attachments') return mockAttachments;
						return undefined;
					},
				);

				const result = getMessageContent.call(mockExecuteFunctions, 0, 2.1, 'instance-123');

				expect((result as any).attachments).toHaveLength(3);
				expect((result as any).attachments[0]).toEqual({
					color: 'good',
					text: 'Attachment text',
					fields: [
						{ title: 'Field 1', value: 'Value 1' },
						{ title: 'Field 2', value: 'Value 2' },
					],
				});
				expect((result as any).attachments[1]).toEqual({
					color: 'warning',
					title: 'Warning attachment',
				});
				expect((result as any).attachments[2]).toEqual({
					text: '_Automated with this <https://test.n8n.io/workflow/workflow-123?utm_source=n8n-internal&utm_medium=powered_by&utm_campaign=n8n-nodes-base.slack_instance-123|n8n workflow>_',
				});
			});

			it('should handle attachment message type with includeLinkToWorkflow false', () => {
				const mockAttachments = [
					{
						text: 'Simple attachment',
					},
				];

				(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
					(param: string, _index: number) => {
						if (param === 'messageType') return 'attachment';
						if (param === 'otherOptions.includeLinkToWorkflow') return false;
						if (param === 'text') return '';
						if (param === 'attachments') return mockAttachments;
						return undefined;
					},
				);

				const result = getMessageContent.call(mockExecuteFunctions, 0, 2.1, 'instance-123');

				expect((result as any).attachments).toHaveLength(1);
				expect((result as any).attachments[0]).toEqual({
					text: 'Simple attachment',
				});
			});

			it('should handle attachment with undefined fields', () => {
				const mockAttachments = [
					{
						text: 'No fields attachment',
						fields: undefined,
					},
				];

				(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
					(param: string, _index: number) => {
						if (param === 'messageType') return 'attachment';
						if (param === 'otherOptions.includeLinkToWorkflow') return false;
						if (param === 'text') return '';
						if (param === 'attachments') return mockAttachments;
						return undefined;
					},
				);

				const result = getMessageContent.call(mockExecuteFunctions, 0, 2.1, 'instance-123');

				expect((result as any).attachments[0]).toEqual({
					text: 'No fields attachment',
					fields: undefined,
				});
			});

			it('should handle attachment with non-array attachments', () => {
				(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
					(param: string, _index: number) => {
						if (param === 'messageType') return 'attachment';
						if (param === 'otherOptions.includeLinkToWorkflow') return true;
						if (param === 'text') return '';
						if (param === 'attachments') return 'invalid-format';
						return undefined;
					},
				);

				const result = getMessageContent.call(mockExecuteFunctions, 0, 2.1, 'instance-123');

				// The function will treat the string as an iterable, so each character becomes an attachment
				// Plus the attribution link is added
				expect((result as any).attachments).toHaveLength(15);
				expect((result as any).attachments[(result as any).attachments.length - 1]).toEqual({
					text: '_Automated with this <https://test.n8n.io/workflow/workflow-123?utm_source=n8n-internal&utm_medium=powered_by&utm_campaign=n8n-nodes-base.slack_instance-123|n8n workflow>_',
				});
			});
		});

		it('should throw error for unknown message type', () => {
			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(param: string, _index: number) => {
					if (param === 'messageType') return 'unknown-type';
					return undefined;
				},
			);

			expect(() => {
				getMessageContent.call(mockExecuteFunctions, 0, 2.1, 'instance-123');
			}).toThrow(NodeOperationError);

			expect(() => {
				getMessageContent.call(mockExecuteFunctions, 0, 2.1, 'instance-123');
			}).toThrow('The message type "unknown-type" is not known!');
		});
	});
});
