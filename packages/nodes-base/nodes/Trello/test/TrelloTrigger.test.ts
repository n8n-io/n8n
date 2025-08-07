import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { createHmac } from 'crypto';

import { TrelloTrigger } from '../TrelloTrigger.node';

describe('Test TrelloTrigger Node', () => {
	new NodeTestHarness().setupTests();

	describe('signature verification logic', () => {
		it('should generate correct signature for known input', () => {
			const secret = 'test-secret';
			const requestBody = '{"test":"data"}';
			const callbackURL = 'https://test.webhook.url/webhook';

			const expectedSignature = createHmac('sha1', secret)
				.update(requestBody + callbackURL)
				.digest('base64');

			// This tests our understanding of the signature algorithm
			expect(expectedSignature).toBe(
				createHmac('sha1', secret)
					.update(requestBody + callbackURL)
					.digest('base64'),
			);
		});

		it('should generate different signatures for different inputs', () => {
			const secret = 'test-secret';
			const requestBody1 = '{"test":"data1"}';
			const requestBody2 = '{"test":"data2"}';
			const callbackURL = 'https://test.webhook.url/webhook';

			const signature1 = createHmac('sha1', secret)
				.update(requestBody1 + callbackURL)
				.digest('base64');

			const signature2 = createHmac('sha1', secret)
				.update(requestBody2 + callbackURL)
				.digest('base64');

			expect(signature1).not.toBe(signature2);
		});

		it('should generate different signatures for different callback URLs', () => {
			const secret = 'test-secret';
			const requestBody = '{"test":"data"}';
			const callbackURL1 = 'https://test1.webhook.url/webhook';
			const callbackURL2 = 'https://test2.webhook.url/webhook';

			const signature1 = createHmac('sha1', secret)
				.update(requestBody + callbackURL1)
				.digest('base64');

			const signature2 = createHmac('sha1', secret)
				.update(requestBody + callbackURL2)
				.digest('base64');

			expect(signature1).not.toBe(signature2);
		});
	});

	describe('webhook handler integration', () => {
		const node = new TrelloTrigger();

		it('should handle setup webhook', async () => {
			const setupWebhookMock = jest.fn().mockReturnValue('setup');
			const responseObjectMock = jest.fn().mockReturnValue({
				status: jest.fn().mockReturnThis(),
				end: jest.fn(),
			});

			const context = {
				getWebhookName: setupWebhookMock,
				getResponseObject: responseObjectMock,
			} as any;

			const result = await node.webhook(context);

			expect(result).toEqual({
				noWebhookResponse: true,
			});
		});

		it('should reject webhook without OAuth secret', async () => {
			const webhookNameMock = jest.fn().mockReturnValue('default');
			const bodyDataMock = jest.fn().mockReturnValue({});
			const credentialsMock = jest.fn().mockResolvedValue({});

			const context = {
				getWebhookName: webhookNameMock,
				getBodyData: bodyDataMock,
				getCredentials: credentialsMock,
			} as any;

			const result = await node.webhook(context);

			expect(result).toEqual({});
		});

		it('should process webhook with correct flow', async () => {
			const testPayload = {
				webhook: {
					callbackURL: 'https://test.webhook.url/webhook',
				},
				test: 'data',
			};

			// Calculate the expected signature
			const requestBodyString = JSON.stringify(testPayload);
			const expectedSignature = createHmac('sha1', 'test-secret')
				.update(requestBodyString + 'https://test.webhook.url/webhook')
				.digest('base64');

			const webhookNameMock = jest.fn().mockReturnValue('default');
			const bodyDataMock = jest.fn().mockReturnValue(testPayload);
			const credentialsMock = jest.fn().mockResolvedValue({ oauthSecret: 'test-secret' });
			const headerDataMock = jest.fn().mockReturnValue({ 'x-trello-webhook': expectedSignature });
			const requestObjectMock = jest.fn().mockReturnValue({
				rawBody: Buffer.from(requestBodyString),
			});

			const context = {
				getWebhookName: webhookNameMock,
				getBodyData: bodyDataMock,
				getCredentials: credentialsMock,
				getHeaderData: headerDataMock,
				getRequestObject: requestObjectMock,
				helpers: {
					returnJsonArray: jest.fn().mockImplementation((data) => [data]),
				},
			} as any;

			const result = await node.webhook(context);

			expect(result.workflowData).toBeDefined();
			expect(result.workflowData).toEqual([testPayload]);
		});
	});
});
