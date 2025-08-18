import { createHmac, timingSafeEqual } from 'crypto';
import { SlackTrigger } from '../SlackTrigger.node';
import { IWebhookFunctions } from 'n8n-workflow';

jest.mock('crypto', () => ({
	createHmac: jest.fn().mockReturnValue({
		update: jest.fn().mockReturnThis(),
		digest: jest
			.fn()
			.mockReturnValue('a2114d57b48eac39b9ad189dd8316235a7b4a8d21a10bd27519666489c69b503'),
	}),
	timingSafeEqual: jest.fn(),
}));

describe('SlackTrigger Node', () => {
	let mockWebhookFunctions: IWebhookFunctions;

	beforeEach(() => {
		jest.clearAllMocks();

		mockWebhookFunctions = {
			getNodeParameter: jest.fn().mockImplementation((param: string) => {
				const params = {
					trigger: ['message', 'file_share', 'reaction_added'],
					watchWorkspace: false,
					channelId: 'C0122KQ70S7E',
					downloadFiles: false,
					options: {},
				};
				return params[param];
			}),
			getRequestObject: jest.fn().mockReturnValue({
				header: jest.fn().mockImplementation((header: string) => {
					if (header === 'x-slack-signature')
						return 'v0=a2114d57b48eac39b9ad189dd8316235a7b4a8d21a10bd27519666489c69b503';
					if (header === 'x-slack-request-timestamp') return '1531420618';
					return null;
				}),
				body: {
					event: {
						type: 'message',
						channel: 'C0122KQ70S7E',
						user: 'U12345',
					},
				},
			}),
			getResponseObject: jest.fn().mockReturnValue({
				status: jest.fn().mockReturnThis(),
				json: jest.fn().mockReturnThis(),
				send: jest.fn().mockReturnThis(),
				end: jest.fn().mockReturnThis(),
			}),
			getCredentials: jest.fn().mockResolvedValue({
				signatureSecret: 'xyzz0WbapA4vBCDEFasx0q6G',
			}),
			helpers: {
				prepareBinaryData: jest.fn().mockReturnValue({}),
			},
		} as unknown as IWebhookFunctions;
	});

	it('should process a message event and trigger the workflow', async () => {
		const slackTrigger = new SlackTrigger();
		const response = await slackTrigger.webhook.call(mockWebhookFunctions);

		expect(response.workflowData).toHaveLength(1);
		expect(response.workflowData[0][0].json).toEqual({
			type: 'message',
			channel: 'C0122KQ70S7E',
			user: 'U12345',
		});
	});

	it('should ignore events from other channels', async () => {
		mockWebhookFunctions.getRequestObject.mockReturnValue({
			header: jest.fn().mockImplementation((header: string) => {
				if (header === 'x-slack-signature')
					return 'v0=a2114d57b48eac39b9ad189dd8316235a7b4a8d21a10bd27519666489c69b503';
				if (header === 'x-slack-request-timestamp') return '1531420618';
				return null;
			}),
			body: {
				event: {
					type: 'message',
					channel: 'C98765',
					user: 'U12345',
				},
			},
		});

		const slackTrigger = new SlackTrigger();
		const response = await slackTrigger.webhook.call(mockWebhookFunctions);

		expect(response.workflowData).toHaveLength(0);
	});

	it('should download files if configured', async () => {
		mockWebhookFunctions.getNodeParameter = jest.fn().mockImplementation((param: string) => {
			const params = {
				trigger: ['file_share'],
				watchWorkspace: false,
				channelId: 'C0122KQ70S7E',
				downloadFiles: true,
				options: {},
			};
			return params[param];
		});

		mockWebhookFunctions.getRequestObject.mockReturnValueOnce({
			header: jest.fn().mockImplementation((header: string) => {
				if (header === 'x-slack-signature')
					return 'v0=a2114d57b48eac39b9ad189dd8316235a7b4a8d21a10bd27519666489c69b503';
				if (header === 'x-slack-request-timestamp') return '1531420618';
				return null;
			}),
			body: {
				event: {
					type: 'file_share',
					channel: 'C0122KQ70S7E',
					files: [
						{
							url_private_download:
								'https://files.slack.com/files-pri/T12345-1234567890/sample.png',
							name: 'sample.png',
							mimetype: 'image/png',
						},
					],
				},
			},
		});

		const slackTrigger = new SlackTrigger();
		const response = await slackTrigger.webhook.call(mockWebhookFunctions);

		expect(response.workflowData).toHaveLength(1);
		expect(response.workflowData[0][0].binary).not.toBeUndefined();
		expect(mockWebhookFunctions.helpers.prepareBinaryData).toHaveBeenCalled();
	});
});
