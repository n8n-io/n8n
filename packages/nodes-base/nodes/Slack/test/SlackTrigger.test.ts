import { mock } from 'jest-mock-extended';
import type { IWebhookFunctions, INodeType } from 'n8n-workflow';

import { SlackTrigger } from '../SlackTrigger.node';

// Mock the helper functions
jest.mock('../SlackTriggerHelpers', () => ({
	verifySignature: jest.fn().mockResolvedValue(true),
	getChannelInfo: jest.fn().mockResolvedValue({ id: 'C123', name: 'test-channel' }),
	getUserInfo: jest.fn().mockResolvedValue({ id: 'U123', name: 'test-user' }),
	downloadFile: jest.fn().mockResolvedValue(Buffer.from('test file content')),
}));

describe('SlackTrigger Node', () => {
	let slackTrigger: INodeType;
	let mockWebhookFunctions: ReturnType<typeof mock<IWebhookFunctions>>;

	beforeEach(() => {
		jest.clearAllMocks();
		slackTrigger = new SlackTrigger();
		mockWebhookFunctions = mock<IWebhookFunctions>();

		// Mock helpers
		mockWebhookFunctions.helpers = {
			prepareBinaryData: jest.fn().mockResolvedValue({
				data: 'binary-data',
				mimeType: 'text/plain',
				fileName: 'test.txt',
			}),
		} as any;

		// Default mock setup
		mockWebhookFunctions.getNodeParameter.mockImplementation(
			(paramName: string, defaultValue?: any) => {
				switch (paramName) {
					case 'trigger':
						return ['file_share'];
					case 'watchWorkspace':
						return false;
					case 'channelId':
						return 'C123';
					case 'downloadFiles':
						return false;
					case 'options':
						return {};
					default:
						return defaultValue;
				}
			},
		);

		mockWebhookFunctions.getResponseObject.mockReturnValue({
			status: jest.fn().mockReturnThis(),
			send: jest.fn().mockReturnThis(),
			json: jest.fn().mockReturnThis(),
			end: jest.fn(),
		} as any);
	});

	describe('webhook method - eventChannel extraction', () => {
		it('should extract eventChannel from req.body.event.channel when available', async () => {
			const mockRequest = {
				body: {
					type: 'event_callback',
					event: {
						type: 'message',
						channel: 'C123',
						user: 'U456',
						text: 'Hello world',
					},
				},
			};

			mockWebhookFunctions.getRequestObject.mockReturnValue(mockRequest as any);

			const result = await slackTrigger.webhook!.call(mockWebhookFunctions);

			expect(result.workflowData).toBeDefined();
			expect(result.workflowData![0][0].json).toEqual(mockRequest.body.event);
		});

		it('should extract eventChannel from req.body.event.item.channel when event.channel is not available', async () => {
			const mockRequest = {
				body: {
					type: 'event_callback',
					event: {
						type: 'reaction_added',
						user: 'U456',
						item: {
							channel: 'C123',
							ts: '1234567890.123456',
						},
						reaction: 'thumbsup',
					},
				},
			};

			mockWebhookFunctions.getRequestObject.mockReturnValue(mockRequest as any);
			mockWebhookFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'trigger':
						return ['reaction_added'];
					case 'watchWorkspace':
						return false;
					case 'channelId':
						return 'C123';
					default:
						return {};
				}
			});

			const result = await slackTrigger.webhook!.call(mockWebhookFunctions);

			expect(result.workflowData).toBeDefined();
			expect(result.workflowData![0][0].json).toEqual(mockRequest.body.event);
		});

		it('should handle when req.body.event.item is undefined/null without throwing error', async () => {
			const mockRequest = {
				body: {
					type: 'event_callback',
					event: {
						type: 'reaction_added',
						user: 'U456',
						item: null, // This could cause the original error
						reaction: 'thumbsup',
						channel_id: 'C123',
					},
				},
			};

			mockWebhookFunctions.getRequestObject.mockReturnValue(mockRequest as any);
			mockWebhookFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'trigger':
						return ['reaction_added'];
					case 'watchWorkspace':
						return false;
					case 'channelId':
						return 'C123';
					default:
						return {};
				}
			});

			// This should not throw an error
			const result = await slackTrigger.webhook!.call(mockWebhookFunctions);

			expect(result.workflowData).toBeDefined();
			expect(result.workflowData![0][0].json).toEqual(mockRequest.body.event);
		});

		it('should fallback to req.body.event.channel_id when channel and item.channel are not available', async () => {
			const mockRequest = {
				body: {
					type: 'event_callback',
					event: {
						type: 'message',
						user: 'U456',
						text: 'Hello world',
						channel_id: 'C123', // Fallback value
					},
				},
			};

			mockWebhookFunctions.getRequestObject.mockReturnValue(mockRequest as any);

			const result = await slackTrigger.webhook!.call(mockWebhookFunctions);

			expect(result.workflowData).toBeDefined();
			expect(result.workflowData![0][0].json).toEqual(mockRequest.body.event);
		});

		it('should handle file_share event with undefined item gracefully', async () => {
			const mockRequest = {
				body: {
					type: 'event_callback',
					event: {
						type: 'message',
						subtype: 'file_share',
						user: 'U456',
						channel: 'C123',
						files: [
							{
								id: 'F123',
								name: 'test.txt',
								url_private_download: 'https://files.slack.com/test.txt',
								mimetype: 'text/plain',
							},
						],
					},
				},
			};

			mockWebhookFunctions.getRequestObject.mockReturnValue(mockRequest as any);

			const result = await slackTrigger.webhook!.call(mockWebhookFunctions);

			expect(result.workflowData).toBeDefined();
			expect(result.workflowData![0][0].json).toEqual(mockRequest.body.event);
		});

		it('should handle complex event structure without throwing errors', async () => {
			const mockRequest = {
				body: {
					type: 'event_callback',
					event: {
						type: 'app_mention',
						user: 'U456',
						text: '<@U123> hello there',
						// No channel, item, or channel_id - edge case
					},
				},
			};

			mockWebhookFunctions.getRequestObject.mockReturnValue(mockRequest as any);
			mockWebhookFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'trigger':
						return ['app_mention'];
					case 'watchWorkspace':
						return true; // Watch whole workspace, so channel check should be skipped
					default:
						return {};
				}
			});

			const result = await slackTrigger.webhook!.call(mockWebhookFunctions);

			expect(result.workflowData).toBeDefined();
			expect(result.workflowData![0][0].json).toEqual(mockRequest.body.event);
		});
	});

	describe('webhook method - file_share event handling', () => {
		it('should handle file_share event when item is undefined', async () => {
			const mockRequest = {
				body: {
					type: 'event_callback',
					event: {
						type: 'message',
						subtype: 'file_share',
						user: 'U456',
						channel: 'C123',
						files: [
							{
								id: 'F123',
								name: 'test.txt',
								url_private_download: 'https://files.slack.com/test.txt',
								mimetype: 'text/plain',
							},
						],
						item: undefined, // This was causing the original error
					},
				},
			};

			mockWebhookFunctions.getRequestObject.mockReturnValue(mockRequest as any);
			mockWebhookFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'trigger':
						return ['file_share'];
					case 'downloadFiles':
						return true;
					case 'watchWorkspace':
						return false;
					case 'channelId':
						return 'C123';
					default:
						return {};
				}
			});

			const result = await slackTrigger.webhook!.call(mockWebhookFunctions);

			expect(result.workflowData).toBeDefined();
			expect(result.workflowData![0][0].json).toEqual(mockRequest.body.event);
			expect(result.workflowData![0][0].binary).toBeDefined();
		});

		it('should handle file_share event when item is null', async () => {
			const mockRequest = {
				body: {
					type: 'event_callback',
					event: {
						type: 'message',
						subtype: 'file_share',
						user: 'U456',
						channel: 'C123',
						files: [
							{
								id: 'F123',
								name: 'test.txt',
								url_private_download: 'https://files.slack.com/test.txt',
								mimetype: 'text/plain',
							},
						],
						item: null, // Another potential error case
					},
				},
			};

			mockWebhookFunctions.getRequestObject.mockReturnValue(mockRequest as any);
			mockWebhookFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'trigger':
						return ['file_share'];
					case 'downloadFiles':
						return false;
					case 'watchWorkspace':
						return false;
					case 'channelId':
						return 'C123';
					default:
						return {};
				}
			});

			const result = await slackTrigger.webhook!.call(mockWebhookFunctions);

			expect(result.workflowData).toBeDefined();
			expect(result.workflowData![0][0].json).toEqual(mockRequest.body.event);
		});

		it('should handle file_share event with valid item.channel', async () => {
			const mockRequest = {
				body: {
					type: 'event_callback',
					event: {
						type: 'message',
						subtype: 'file_share',
						user: 'U456',
						files: [
							{
								id: 'F123',
								name: 'test.txt',
								url_private_download: 'https://files.slack.com/test.txt',
								mimetype: 'text/plain',
							},
						],
						item: {
							channel: 'C123',
							ts: '1234567890.123456',
						},
					},
				},
			};

			mockWebhookFunctions.getRequestObject.mockReturnValue(mockRequest as any);
			mockWebhookFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'trigger':
						return ['file_share'];
					case 'downloadFiles':
						return false;
					case 'watchWorkspace':
						return false;
					case 'channelId':
						return 'C123';
					default:
						return {};
				}
			});

			const result = await slackTrigger.webhook!.call(mockWebhookFunctions);

			expect(result.workflowData).toBeDefined();
			expect(result.workflowData![0][0].json).toEqual(mockRequest.body.event);
		});
	});

	describe('webhook method - other event scenarios', () => {
		it('should handle team_join event (no channel extraction needed)', async () => {
			const mockRequest = {
				body: {
					type: 'event_callback',
					event: {
						type: 'team_join',
						user: {
							id: 'U789',
							name: 'newuser',
							real_name: 'New User',
						},
					},
				},
			};

			mockWebhookFunctions.getRequestObject.mockReturnValue(mockRequest as any);
			mockWebhookFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'trigger':
						return ['team_join'];
					default:
						return {};
				}
			});

			const result = await slackTrigger.webhook!.call(mockWebhookFunctions);

			expect(result.workflowData).toBeDefined();
			expect(result.workflowData![0][0].json).toEqual(mockRequest.body.event);
		});

		it('should handle url_verification challenge', async () => {
			const mockRequest = {
				body: {
					type: 'url_verification',
					challenge: 'test_challenge_123',
				},
			};

			mockWebhookFunctions.getRequestObject.mockReturnValue(mockRequest as any);

			const result = await slackTrigger.webhook!.call(mockWebhookFunctions);

			expect(result.noWebhookResponse).toBe(true);
			expect(mockWebhookFunctions.getResponseObject().status).toHaveBeenCalledWith(200);
			expect(mockWebhookFunctions.getResponseObject().json).toHaveBeenCalledWith({
				challenge: 'test_challenge_123',
			});
		});
	});
});
