import type { IExecuteFunctions } from 'n8n-workflow';

import {
	slackApiRequest,
	slackApiRequestAllItems,
	processThreadOptions,
} from '../../V2/GenericFunctions';

jest.mock('n8n-workflow', () => ({
	...jest.requireActual('n8n-workflow'),
	NodeApiError: jest.fn(),
}));

describe('Slack V2 > GenericFunctions', () => {
	let mockExecuteFunctions: IExecuteFunctions;

	beforeEach(() => {
		jest.clearAllMocks();
		mockExecuteFunctions = {
			helpers: {
				requestWithAuthentication: jest.fn(),
			},
			getNode: jest.fn().mockReturnValue({ type: 'n8n-nodes-base.slack', typeVersion: 2 }),
			getNodeParameter: jest.fn().mockReturnValue('accessToken'),
		} as unknown as IExecuteFunctions;
	});

	describe('slackApiRequest', () => {
		it('should handle paid_teams_only error', async () => {
			const mockResponse = { ok: false, error: 'paid_teams_only' };
			mockExecuteFunctions.helpers.requestWithAuthentication = jest
				.fn()
				.mockResolvedValue(mockResponse);

			await expect(slackApiRequest.call(mockExecuteFunctions, 'GET', '/test')).rejects.toThrow();
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

		it('should extract thread_ts when provided', () => {
			const threadOptions = {
				replyValues: {
					thread_ts: 1709203825.689579,
				},
			};
			const result = processThreadOptions(threadOptions);
			expect(result).toEqual({
				thread_ts: 1709203825.689579,
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
				thread_ts: 1709203825.689579,
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
				thread_ts: 1709203825.689579,
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
				thread_ts: 1709203825.689579,
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
				thread_ts: 1709203825.689579,
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
				thread_ts: 1709203825.689579,
				reply_broadcast: true,
			});
		});
	});
});
