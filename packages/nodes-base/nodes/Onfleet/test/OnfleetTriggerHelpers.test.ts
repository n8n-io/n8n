import { createHmac } from 'crypto';

import { verifySignature } from '../OnfleetTriggerHelpers';

describe('OnfleetTriggerHelpers', () => {
	const testSecretHex = 'a'.repeat(64);
	const testBody = '{"taskId":"task123","actionContext":"COMPLETE"}';

	const computeSignature = (secretHex: string, body: string): string => {
		const hmac = createHmac('sha512', Buffer.from(secretHex, 'hex'));
		hmac.update(Buffer.from(body));
		return hmac.digest('hex');
	};

	const validSignature = computeSignature(testSecretHex, testBody);

	let mockWebhookFunctions: any;

	beforeEach(() => {
		jest.clearAllMocks();

		mockWebhookFunctions = {
			getCredentials: jest.fn(),
			getRequestObject: jest.fn(),
		};

		mockWebhookFunctions.getRequestObject.mockReturnValue({
			header: jest.fn().mockImplementation((header: string) => {
				if (header === 'x-onfleet-signature') return validSignature;
				return undefined;
			}),
			rawBody: Buffer.from(testBody),
		});
	});

	describe('verifySignature', () => {
		it('returns true when no credentials are provided (backward compatibility)', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
			expect(mockWebhookFunctions.getCredentials).toHaveBeenCalledWith('onfleetApi');
		});

		it('returns true when no signing secret is configured (backward compatibility)', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				apiKey: 'test-api-key',
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});

		it('returns true when signature is valid', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				apiKey: 'test-api-key',
				signingSecret: testSecretHex,
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});

		it('returns false when signature is invalid', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				signingSecret: testSecretHex,
			});

			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockImplementation((header: string) => {
					if (header === 'x-onfleet-signature') return 'f'.repeat(128);
					return undefined;
				}),
				rawBody: Buffer.from(testBody),
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});

		it('returns false when signature header is missing', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				signingSecret: testSecretHex,
			});

			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockReturnValue(undefined),
				rawBody: Buffer.from(testBody),
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});

		it('returns false when raw body is missing', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				signingSecret: testSecretHex,
			});

			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockReturnValue(validSignature),
				rawBody: undefined,
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});

		it('returns false when getCredentials throws', async () => {
			mockWebhookFunctions.getCredentials.mockRejectedValue(new Error('credentials not found'));

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});
	});
});
