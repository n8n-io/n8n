import { createHmac } from 'crypto';

import { verifySignature } from '../TrelloTriggerHelpers';

describe('TrelloTriggerHelpers', () => {
	let mockWebhookFunctions: any;
	const testOauthSecret = 'test-oauth-secret-12345';
	const testCallbackURL = 'https://example.com/webhook';
	const testPayload = '{"action":{"type":"createCard"},"model":{"id":"123"}}';

	beforeEach(() => {
		jest.clearAllMocks();

		mockWebhookFunctions = {
			getCredentials: jest.fn(),
			getRequestObject: jest.fn(),
			getNodeWebhookUrl: jest.fn().mockReturnValue(testCallbackURL),
		};
	});

	describe('verifySignature', () => {
		it('should return true if no OAuth secret is configured', async () => {
			// No OAuth secret configured (backward compatibility)
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				apiKey: 'test-key',
				apiToken: 'test-token',
			});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockReturnValue(null),
				rawBody: Buffer.from(testPayload),
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});

		it('should return true if OAuth secret is empty string', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				apiKey: 'test-key',
				apiToken: 'test-token',
				oauthSecret: '',
			});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockReturnValue(null),
				rawBody: Buffer.from(testPayload),
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});

		it('should return true if signatures match (Buffer rawBody)', async () => {
			// Compute the expected signature exactly as Trello does
			const hmac = createHmac('sha1', testOauthSecret);
			hmac.update(testPayload + testCallbackURL);
			const expectedSignature = hmac.digest('base64');

			mockWebhookFunctions.getCredentials.mockResolvedValue({
				apiKey: 'test-key',
				apiToken: 'test-token',
				oauthSecret: testOauthSecret,
			});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockImplementation((header) => {
					if (header === 'x-trello-webhook') return expectedSignature;
					return null;
				}),
				rawBody: Buffer.from(testPayload),
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});

		it('should return true if signatures match (string rawBody)', async () => {
			// Compute the expected signature exactly as Trello does
			const hmac = createHmac('sha1', testOauthSecret);
			hmac.update(testPayload + testCallbackURL);
			const expectedSignature = hmac.digest('base64');

			mockWebhookFunctions.getCredentials.mockResolvedValue({
				apiKey: 'test-key',
				apiToken: 'test-token',
				oauthSecret: testOauthSecret,
			});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockImplementation((header) => {
					if (header === 'x-trello-webhook') return expectedSignature;
					return null;
				}),
				rawBody: testPayload,
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});

		it('should return false if signatures do not match', async () => {
			const wrongSignature = 'wrongsignature1234567890';

			mockWebhookFunctions.getCredentials.mockResolvedValue({
				apiKey: 'test-key',
				apiToken: 'test-token',
				oauthSecret: testOauthSecret,
			});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockImplementation((header) => {
					if (header === 'x-trello-webhook') return wrongSignature;
					return null;
				}),
				rawBody: Buffer.from(testPayload),
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});

		it('should return false if signature header is missing but secret is configured', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				apiKey: 'test-key',
				apiToken: 'test-token',
				oauthSecret: testOauthSecret,
			});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockReturnValue(null),
				rawBody: Buffer.from(testPayload),
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});

		it('should return false if rawBody is missing but secret is configured', async () => {
			const hmac = createHmac('sha1', testOauthSecret);
			hmac.update(testPayload + testCallbackURL);
			const expectedSignature = hmac.digest('base64');

			mockWebhookFunctions.getCredentials.mockResolvedValue({
				apiKey: 'test-key',
				apiToken: 'test-token',
				oauthSecret: testOauthSecret,
			});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockImplementation((header) => {
					if (header === 'x-trello-webhook') return expectedSignature;
					return null;
				}),
				rawBody: undefined,
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});

		it('should correctly compute signature using callback URL', async () => {
			const customCallbackURL = 'https://custom.example.com/trello/callback?param=value';
			mockWebhookFunctions.getNodeWebhookUrl.mockReturnValue(customCallbackURL);

			// Compute signature with custom callback URL
			const hmac = createHmac('sha1', testOauthSecret);
			hmac.update(testPayload + customCallbackURL);
			const expectedSignature = hmac.digest('base64');

			mockWebhookFunctions.getCredentials.mockResolvedValue({
				apiKey: 'test-key',
				apiToken: 'test-token',
				oauthSecret: testOauthSecret,
			});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockImplementation((header) => {
					if (header === 'x-trello-webhook') return expectedSignature;
					return null;
				}),
				rawBody: Buffer.from(testPayload),
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
			expect(mockWebhookFunctions.getNodeWebhookUrl).toHaveBeenCalledWith('default');
		});
	});
});
