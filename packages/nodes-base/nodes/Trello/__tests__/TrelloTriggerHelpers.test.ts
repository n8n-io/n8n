import { createHmac } from 'crypto';
import type { IWebhookFunctions } from 'n8n-workflow';

import { verifySignature } from '../TrelloTriggerHelpers';

describe('TrelloTriggerHelpers', () => {
	describe('verifySignature', () => {
		let mockWebhookFunctions: IWebhookFunctions;
		const testOauthSecret = 'test-oauth-secret-key-12345';
		const testBody = '{"action":{"type":"updateCard"},"model":{"id":"123"}}';
		const testCallbackURL = 'https://example.com/webhook/trello';

		function generateValidSignature(body: string, callbackURL: string, secret: string): string {
			// Trello signature: base64(HMACSHA1(body + callbackURL))
			return createHmac('sha1', secret)
				.update(body + callbackURL)
				.digest('base64');
		}

		beforeEach(() => {
			mockWebhookFunctions = {
				getCredentials: jest.fn().mockResolvedValue({
					oauthSecret: testOauthSecret,
				}),
				getRequestObject: jest.fn().mockReturnValue({
					rawBody: Buffer.from(testBody),
				}),
				getHeaderData: jest.fn().mockReturnValue({
					'x-trello-webhook': generateValidSignature(testBody, testCallbackURL, testOauthSecret),
				}),
				getNodeWebhookUrl: jest.fn().mockReturnValue(testCallbackURL),
			} as unknown as IWebhookFunctions;
		});

		it('should return true when no OAuth secret is configured (backwards compatibility)', async () => {
			(mockWebhookFunctions.getCredentials as jest.Mock).mockResolvedValue({});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});

		it('should return true when OAuth secret is null (backwards compatibility)', async () => {
			(mockWebhookFunctions.getCredentials as jest.Mock).mockResolvedValue({
				oauthSecret: null,
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});

		it('should return true when OAuth secret is empty string (backwards compatibility)', async () => {
			(mockWebhookFunctions.getCredentials as jest.Mock).mockResolvedValue({
				oauthSecret: '',
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});

		it('should return false when signature header is missing', async () => {
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});

		it('should return false when rawBody is missing', async () => {
			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				rawBody: undefined,
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});

		it('should return true when signature is valid', async () => {
			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
			expect(mockWebhookFunctions.getNodeWebhookUrl).toHaveBeenCalledWith('default');
		});

		it('should return false when signature is invalid', async () => {
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({
				'x-trello-webhook': 'invalid-signature',
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});

		it('should return false when signature is computed with wrong secret', async () => {
			const wrongSecret = 'wrong-secret-key';
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({
				'x-trello-webhook': generateValidSignature(testBody, testCallbackURL, wrongSecret),
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});

		it('should return false when signature is computed with wrong callbackURL', async () => {
			const wrongCallbackURL = 'https://wrong-url.com/webhook';
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({
				'x-trello-webhook': generateValidSignature(testBody, wrongCallbackURL, testOauthSecret),
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});

		it('should handle Buffer rawBody correctly', async () => {
			const bufferBody = Buffer.from(testBody);
			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				rawBody: bufferBody,
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});

		it('should handle string rawBody correctly', async () => {
			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				rawBody: testBody, // String instead of Buffer
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});

		it('should return false when computed and provided signatures have different lengths', async () => {
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({
				'x-trello-webhook': 'short',
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});

		it('should handle empty body', async () => {
			const emptyBody = '';
			const validSignature = generateValidSignature(emptyBody, testCallbackURL, testOauthSecret);
			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				rawBody: Buffer.from(emptyBody),
			});
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({
				'x-trello-webhook': validSignature,
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});

		it('should handle complex JSON body with special characters', async () => {
			const complexBody =
				'{"action":{"type":"commentCard","data":{"text":"Test with émojis 🎉 and spëcial chars"}}}';
			const validSignature = generateValidSignature(complexBody, testCallbackURL, testOauthSecret);
			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				rawBody: Buffer.from(complexBody, 'utf8'),
			});
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({
				'x-trello-webhook': validSignature,
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});

		it('should handle different callbackURL formats', async () => {
			const callbackWithParams = 'https://example.com/webhook/trello?param=value';
			const validSignature = generateValidSignature(testBody, callbackWithParams, testOauthSecret);
			(mockWebhookFunctions.getNodeWebhookUrl as jest.Mock).mockReturnValue(callbackWithParams);
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({
				'x-trello-webhook': validSignature,
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});
	});
});
