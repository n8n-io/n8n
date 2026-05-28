import { createHmac } from 'crypto';
import type { IWebhookFunctions } from 'n8n-workflow';

import { verifySignature } from '../ZendeskTriggerHelpers';

describe('ZendeskTriggerHelpers', () => {
	describe('verifySignature', () => {
		let mockWebhookFunctions: IWebhookFunctions;
		const testWebhookSecret = 'dGhpc19zZWNyZXRfaXNfZm9yX3Rlc3Rpbmdfb25seQ==';
		const testBody = '{"ticket":{"id":"123","subject":"Test ticket","status":"open"}}';
		const testTimestamp = '2024-01-15T10:30:00Z';

		function generateValidSignature(timestamp: string, body: string, secret: string): string {
			// Zendesk signature: base64(HMACSHA256(TIMESTAMP + BODY))
			return createHmac('sha256', secret)
				.update(timestamp + body)
				.digest('base64');
		}

		beforeEach(() => {
			mockWebhookFunctions = {
				getWorkflowStaticData: jest.fn().mockReturnValue({
					webhookSecret: testWebhookSecret,
				}),
				getRequestObject: jest.fn().mockReturnValue({
					rawBody: Buffer.from(testBody),
				}),
				getHeaderData: jest.fn().mockReturnValue({
					'x-zendesk-webhook-signature': generateValidSignature(
						testTimestamp,
						testBody,
						testWebhookSecret,
					),
					'x-zendesk-webhook-signature-timestamp': testTimestamp,
				}),
			} as unknown as IWebhookFunctions;
		});

		it('should return true when no webhook secret is stored (backwards compatibility)', () => {
			(mockWebhookFunctions.getWorkflowStaticData as jest.Mock).mockReturnValue({});

			const result = verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
			expect(mockWebhookFunctions.getWorkflowStaticData).toHaveBeenCalledWith('node');
		});

		it('should return false when signature header is missing', () => {
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({
				'x-zendesk-webhook-signature-timestamp': testTimestamp,
			});

			const result = verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});

		it('should return false when timestamp header is missing', () => {
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({
				'x-zendesk-webhook-signature': generateValidSignature(
					testTimestamp,
					testBody,
					testWebhookSecret,
				),
			});

			const result = verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});

		it('should return false when rawBody is missing', () => {
			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				rawBody: undefined,
			});

			const result = verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});

		it('should return true when signature is valid', () => {
			const result = verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});

		it('should return false when signature is invalid', () => {
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({
				'x-zendesk-webhook-signature': 'invalid-signature',
				'x-zendesk-webhook-signature-timestamp': testTimestamp,
			});

			const result = verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});

		it('should return false when signature is computed with wrong secret', () => {
			const wrongSecret = 'wrong_secret_key';
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({
				'x-zendesk-webhook-signature': generateValidSignature(testTimestamp, testBody, wrongSecret),
				'x-zendesk-webhook-signature-timestamp': testTimestamp,
			});

			const result = verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});

		it('should handle Buffer rawBody correctly', () => {
			const bufferBody = Buffer.from(testBody);
			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				rawBody: bufferBody,
			});

			const result = verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});

		it('should handle string rawBody correctly', () => {
			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				rawBody: testBody, // String instead of Buffer
			});

			const result = verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});

		it('should return false when computed and provided signatures have different lengths', () => {
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({
				'x-zendesk-webhook-signature': 'short',
				'x-zendesk-webhook-signature-timestamp': testTimestamp,
			});

			const result = verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});

		it('should handle different timestamp formats', () => {
			const differentTimestamp = '1705315800';
			const validSignature = generateValidSignature(
				differentTimestamp,
				testBody,
				testWebhookSecret,
			);
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({
				'x-zendesk-webhook-signature': validSignature,
				'x-zendesk-webhook-signature-timestamp': differentTimestamp,
			});

			const result = verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});

		it('should handle empty body', () => {
			const emptyBody = '';
			const validSignature = generateValidSignature(testTimestamp, emptyBody, testWebhookSecret);
			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				rawBody: Buffer.from(emptyBody),
			});
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({
				'x-zendesk-webhook-signature': validSignature,
				'x-zendesk-webhook-signature-timestamp': testTimestamp,
			});

			const result = verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});

		it('should handle complex JSON body with special characters', () => {
			const complexBody =
				'{"ticket":{"id":"123","subject":"Test with émojis 🎉 and spëcial chars"}}';
			const validSignature = generateValidSignature(testTimestamp, complexBody, testWebhookSecret);
			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				rawBody: Buffer.from(complexBody, 'utf8'),
			});
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({
				'x-zendesk-webhook-signature': validSignature,
				'x-zendesk-webhook-signature-timestamp': testTimestamp,
			});

			const result = verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});
	});
});
