import { createHmac } from 'crypto';
import { mock } from 'jest-mock-extended';
import type { IWebhookFunctions, ICredentialDataDecryptedObject } from 'n8n-workflow';

import { SlackTrigger } from '../SlackTrigger.node';

describe('SlackTrigger', () => {
	let slackTrigger: SlackTrigger;
	let context: jest.Mocked<IWebhookFunctions>;
	let dateNowSpy: jest.SpyInstance;

	beforeEach(() => {
		slackTrigger = new SlackTrigger();
		context = mock<IWebhookFunctions>();

		// Default mock implementations
		context.getNodeParameter.mockImplementation((paramName: string) => {
			switch (paramName) {
				case 'trigger':
					return ['message'];
				case 'options':
					return {};
				case 'watchWorkspace':
					return false;
				case 'channelId':
					return 'C1234567890';
				case 'downloadFiles':
					return false;
				default:
					return undefined;
			}
		});

		context.getRequestObject.mockReturnValue({
			body: {
				event: {
					type: 'message',
					channel: 'C1234567890',
					user: 'U1234567890',
					text: 'Hello, world!',
					ts: '1234567890.123456',
				},
			},
			rawBody:
				'{"event":{"type":"message","channel":"C1234567890","user":"U1234567890","text":"Hello, world!","ts":"1234567890.123456"}}',
		} as any);

		context.getHeaderData.mockReturnValue({});
		context.helpers = {
			returnJsonArray: jest.fn((data) => data),
		} as any;
	});

	afterEach(() => {
		// Restore Date.now if it was mocked
		if (dateNowSpy) {
			dateNowSpy.mockRestore();
		}
	});

	describe('webhook method', () => {
		describe('signature verification', () => {
			const testSigningSecret = '8f742231b10e8888abcd99yyyzzz85a5';
			const testTimestamp = '1531420618';
			const testPayload =
				'{"event":{"type":"message","channel":"C1234567890","user":"U1234567890","text":"Hello, world!","ts":"1234567890.123456"}}';

			beforeEach(() => {
				context.getCredentials.mockResolvedValue({
					signingSecret: testSigningSecret,
				} as ICredentialDataDecryptedObject);
			});

			it('should verify valid signature correctly', async () => {
				const baseString = `v0:${testTimestamp}:${testPayload}`;
				const validSignature = `v0=${createHmac('sha256', testSigningSecret)
					.update(baseString)
					.digest('hex')}`;

				context.getHeaderData.mockReturnValue({
					'x-slack-signature': validSignature,
					'x-slack-request-timestamp': testTimestamp,
				});

				context.getRequestObject.mockReturnValue({
					body: {
						event: {
							type: 'message',
							channel: 'C1234567890',
							user: 'U1234567890',
							text: 'Hello, world!',
							ts: '1234567890.123456',
						},
					},
					rawBody: testPayload,
				} as any);

				// Mock current time to be close to test timestamp
				dateNowSpy = jest
					.spyOn(Date, 'now')
					.mockReturnValue(parseInt(testTimestamp, 10) * 1000 + 1000); // 1 second later

				const result = await slackTrigger.webhook.call(context);

				expect(result).toEqual({
					workflowData: [
						[
							{
								json: {
									type: 'message',
									channel: 'C1234567890',
									user: 'U1234567890',
									text: 'Hello, world!',
									ts: '1234567890.123456',
								},
								binary: undefined,
							},
						],
					],
				});
			});

			it('should reject invalid signature', async () => {
				context.getHeaderData.mockReturnValue({
					'x-slack-signature': 'v0=invalid-signature',
					'x-slack-request-timestamp': testTimestamp,
				});

				context.getRequestObject.mockReturnValue({
					body: {
						event: {
							type: 'message',
							channel: 'C1234567890',
							user: 'U1234567890',
							text: 'Hello, world!',
							ts: '1234567890.123456',
						},
					},
					rawBody: testPayload,
				} as any);

				// Mock current time to be close to test timestamp
				dateNowSpy = jest
					.spyOn(Date, 'now')
					.mockReturnValue(parseInt(testTimestamp, 10) * 1000 + 1000);

				const result = await slackTrigger.webhook.call(context);

				expect(result).toEqual({});
			});

			it('should reject requests with missing signature headers', async () => {
				context.getHeaderData.mockReturnValue({
					// Missing signature headers
				});

				const result = await slackTrigger.webhook.call(context);

				expect(result).toEqual({});
			});

			it('should reject requests with old timestamp (replay attack prevention)', async () => {
				const oldTimestamp = (Math.floor(Date.now() / 1000) - 400).toString(); // 400 seconds ago
				const baseString = `v0:${oldTimestamp}:${testPayload}`;
				const validSignature = `v0=${createHmac('sha256', testSigningSecret)
					.update(baseString)
					.digest('hex')}`;

				context.getHeaderData.mockReturnValue({
					'x-slack-signature': validSignature,
					'x-slack-request-timestamp': oldTimestamp,
				});

				context.getRequestObject.mockReturnValue({
					body: {
						event: {
							type: 'message',
							channel: 'C1234567890',
							user: 'U1234567890',
							text: 'Hello, world!',
							ts: '1234567890.123456',
						},
					},
					rawBody: testPayload,
				} as any);

				const result = await slackTrigger.webhook.call(context);

				expect(result).toEqual({});
			});

			it('should accept requests when signing secret is missing (no signature verification)', async () => {
				context.getCredentials.mockResolvedValue({
					// Missing signing secret
				} as ICredentialDataDecryptedObject);

				// No signature headers provided
				context.getHeaderData.mockReturnValue({});

				context.getRequestObject.mockReturnValue({
					body: {
						event: {
							type: 'message',
							channel: 'C1234567890',
							user: 'U1234567890',
							text: 'Hello, world!',
							ts: '1234567890.123456',
						},
					},
					rawBody: testPayload,
				} as any);

				const result = await slackTrigger.webhook.call(context);

				// Should process the webhook without signature verification
				expect(result).toEqual({
					workflowData: [
						[
							{
								json: {
									type: 'message',
									channel: 'C1234567890',
									user: 'U1234567890',
									text: 'Hello, world!',
									ts: '1234567890.123456',
								},
								binary: undefined,
							},
						],
					],
				});
			});
		});
	});
});
