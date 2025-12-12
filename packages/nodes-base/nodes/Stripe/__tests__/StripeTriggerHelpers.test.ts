import { createHmac } from 'crypto';
import type { IWebhookFunctions } from 'n8n-workflow';

import { verifySignature } from '../StripeTriggerHelpers';

describe('StripeTriggerHelpers', () => {
	describe('verifySignature', () => {
		let mockWebhookFunctions: IWebhookFunctions;
		const webhookSecret = 'whsec_test123456789';
		const timestamp = '1234567890';
		const testBody = { type: 'charge.succeeded', id: 'ch_123' };
		const rawBody = JSON.stringify(testBody);

		function generateValidSignature(timestamp: string, body: string, secret: string): string {
			const signedPayload = `${timestamp}.${body}`;
			const signature = createHmac('sha256', secret).update(signedPayload).digest('hex');
			return `t=${timestamp},v1=${signature}`;
		}

		beforeEach(() => {
			mockWebhookFunctions = {
				getCredentials: jest.fn().mockResolvedValue({
					secretKey: 'sk_test_123',
					signatureSecret: webhookSecret,
				}),
				getRequestObject: jest.fn().mockReturnValue({
					header: jest.fn(),
					rawBody: Buffer.from(rawBody),
				}),
			} as unknown as IWebhookFunctions;
		});

		it('should return true when no signature secret is provided', async () => {
			(mockWebhookFunctions.getCredentials as jest.Mock).mockResolvedValue({
				secretKey: 'sk_test_123',
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});

		it('should return false when stripe-signature header is missing', async () => {
			const mockHeader = jest.fn().mockReturnValue(undefined);
			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				header: mockHeader,
				rawBody: Buffer.from(rawBody),
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
			expect(mockHeader).toHaveBeenCalledWith('stripe-signature');
		});

		it('should return false when signature format is invalid', async () => {
			const mockHeader = jest.fn().mockReturnValue('invalid-format');
			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				header: mockHeader,
				rawBody: Buffer.from(rawBody),
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});

		it('should return false when timestamp is missing', async () => {
			const signature = createHmac('sha256', webhookSecret)
				.update(`${timestamp}.${rawBody}`)
				.digest('hex');
			const mockHeader = jest.fn().mockReturnValue(`v1=${signature}`);
			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				header: mockHeader,
				rawBody: Buffer.from(rawBody),
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});

		it('should return false when v1 signature is missing', async () => {
			const mockHeader = jest.fn().mockReturnValue(`t=${timestamp}`);
			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				header: mockHeader,
				rawBody: Buffer.from(rawBody),
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});

		it('should return true when signature is valid', async () => {
			const validSignature = generateValidSignature(timestamp, rawBody, webhookSecret);
			const mockHeader = jest.fn().mockReturnValue(validSignature);
			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				header: mockHeader,
				rawBody: Buffer.from(rawBody),
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});

		it('should return false when signature is invalid', async () => {
			const wrongSecret = 'wrong_secret';
			const invalidSignature = generateValidSignature(timestamp, rawBody, wrongSecret);
			const mockHeader = jest.fn().mockReturnValue(invalidSignature);
			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				header: mockHeader,
				rawBody: Buffer.from(rawBody),
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});

		it('should handle complex signature header with multiple elements', async () => {
			const signature = createHmac('sha256', webhookSecret)
				.update(`${timestamp}.${rawBody}`)
				.digest('hex');
			const complexHeader = `t=${timestamp},v1=${signature},v0=old_signature`;
			const mockHeader = jest.fn().mockReturnValue(complexHeader);
			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				header: mockHeader,
				rawBody: Buffer.from(rawBody),
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});

		it('should handle string rawBody', async () => {
			const validSignature = generateValidSignature(timestamp, rawBody, webhookSecret);
			const mockHeader = jest.fn().mockReturnValue(validSignature);
			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				header: mockHeader,
				rawBody, // String instead of Buffer
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});

		it('should return false when rawBody is missing', async () => {
			const validSignature = generateValidSignature(timestamp, rawBody, webhookSecret);
			const mockHeader = jest.fn().mockReturnValue(validSignature);
			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				header: mockHeader,
				rawBody: null,
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});

		it('should return false when signatureSecret is not a string', async () => {
			const validSignature = generateValidSignature(timestamp, rawBody, webhookSecret);
			const mockHeader = jest.fn().mockReturnValue(validSignature);
			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				header: mockHeader,
				rawBody: Buffer.from(rawBody),
			});
			(mockWebhookFunctions.getCredentials as jest.Mock).mockResolvedValue({
				secretKey: 'sk_test_123',
				signatureSecret: 123, // Not a string
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});
	});
});
