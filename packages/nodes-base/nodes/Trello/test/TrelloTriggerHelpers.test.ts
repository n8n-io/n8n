import { createHmac } from 'crypto';

import { verifySignature } from '../TrelloTriggerHelpers';

describe('TrelloTriggerHelpers', () => {
	let mockWebhookFunctions: any;
	const testSecret = 'test-trello-oauth-secret';
	const testBody = '{"action":{"type":"createCard"},"model":{"id":"abc123"}}';
	const testCallbackUrl = 'https://n8n.example.com/webhook/trello';
	const testSignature = createHmac('sha1', testSecret)
		.update(testBody + testCallbackUrl)
		.digest('base64');

	beforeEach(() => {
		jest.clearAllMocks();

		mockWebhookFunctions = {
			getCredentials: jest.fn().mockResolvedValue({
				oauthSecret: testSecret,
			}),
			getRequestObject: jest.fn().mockReturnValue({
				header: jest.fn().mockImplementation((header: string) => {
					if (header === 'x-trello-webhook') return testSignature;
					return null;
				}),
				rawBody: testBody,
			}),
			getNodeWebhookUrl: jest.fn().mockReturnValue(testCallbackUrl),
			getNode: jest.fn().mockReturnValue({ name: 'Trello Trigger' }),
		};
	});

	describe('verifySignature', () => {
		it('should return true when no OAuth secret is configured', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				apiKey: 'test-key',
				apiToken: 'test-token',
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});

		it('should return true when OAuth secret is empty string', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				oauthSecret: '',
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});

		it('should return true when signature is valid', async () => {
			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});

		it('should return false when signature is invalid', async () => {
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockImplementation((header: string) => {
					if (header === 'x-trello-webhook') return 'invalidsignature';
					return null;
				}),
				rawBody: testBody,
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});

		it('should return false when signature header is missing', async () => {
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockReturnValue(null),
				rawBody: testBody,
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});

		it('should handle rawBody as Buffer', async () => {
			const bodyBuffer = Buffer.from(testBody);
			const bufferSignature = createHmac('sha1', testSecret)
				.update(testBody + testCallbackUrl)
				.digest('base64');

			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockImplementation((header: string) => {
					if (header === 'x-trello-webhook') return bufferSignature;
					return null;
				}),
				rawBody: bodyBuffer,
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});

		it('should include callback URL in signature computation', async () => {
			const differentCallbackUrl = 'https://different.example.com/webhook';
			mockWebhookFunctions.getNodeWebhookUrl.mockReturnValue(differentCallbackUrl);

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});
	});
});
