import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	slackApiRequest,
	slackApiRequestAllItems,
	processThreadOptions,
	getMessageContent,
} from '../../V2/GenericFunctions';

jest.mock('n8n-workflow', () => ({
	...jest.requireActual('n8n-workflow'),
	NodeApiError: jest.fn(),
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
