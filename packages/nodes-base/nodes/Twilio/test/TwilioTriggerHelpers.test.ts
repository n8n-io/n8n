import { createHash, createHmac } from 'crypto';

import { verifySignature } from '../TwilioTriggerHelpers';

describe('TwilioTriggerHelpers', () => {
	const testAuthToken = 'test-twilio-auth-token';
	const sinkUrl = 'https://n8n.example.com/webhook/abc/webhook';
	const testBody = '[{"specversion":"1.0","type":"com.twilio.messaging.inbound-message.received"}]';
	const testBodyHash = createHash('sha256').update(testBody).digest('hex');
	const queryString = `bodySHA256=${testBodyHash}`;
	const signedUrl = `${sinkUrl}?${queryString}`;
	const validSignature = createHmac('sha1', testAuthToken).update(signedUrl).digest('base64');

	let mockWebhookFunctions: any;

	beforeEach(() => {
		jest.clearAllMocks();

		mockWebhookFunctions = {
			getCredentials: jest.fn(),
			getRequestObject: jest.fn(),
			getNodeWebhookUrl: jest.fn().mockReturnValue(sinkUrl),
		};

		mockWebhookFunctions.getRequestObject.mockReturnValue({
			header: jest.fn().mockImplementation((name: string) => {
				if (name === 'x-twilio-signature') return validSignature;
				return null;
			}),
			query: { bodySHA256: testBodyHash },
			rawBody: Buffer.from(testBody),
			originalUrl: `/webhook/abc/webhook?${queryString}`,
		});
	});

	describe('verifySignature', () => {
		it('should return true when no auth token is configured (backward compat)', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				authType: 'apiKey',
				apiKeySid: 'SK123',
				apiKeySecret: 'secret',
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
			expect(mockWebhookFunctions.getCredentials).toHaveBeenCalledWith('twilioApi');
		});

		it('should return true when auth token is empty string', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				authType: 'authToken',
				authToken: '',
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});

		it('should return true when signature is valid', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				authType: 'authToken',
				authToken: testAuthToken,
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});

		it('should return false when signature is invalid', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				authType: 'authToken',
				authToken: testAuthToken,
			});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockImplementation((name: string) => {
					if (name === 'x-twilio-signature') {
						return Buffer.from('invalidsignaturevaluepadded').toString('base64');
					}
					return null;
				}),
				query: { bodySHA256: testBodyHash },
				rawBody: Buffer.from(testBody),
				originalUrl: `/webhook/abc/webhook?${queryString}`,
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});

		it('should return false when X-Twilio-Signature header is missing', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				authType: 'authToken',
				authToken: testAuthToken,
			});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockReturnValue(null),
				query: { bodySHA256: testBodyHash },
				rawBody: Buffer.from(testBody),
				originalUrl: `/webhook/abc/webhook?${queryString}`,
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});

		it('should return false when bodySHA256 query param is missing', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				authType: 'authToken',
				authToken: testAuthToken,
			});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockReturnValue(validSignature),
				query: {},
				rawBody: Buffer.from(testBody),
				originalUrl: '/webhook/abc/webhook',
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});

		it('should return false when bodySHA256 does not match raw body hash', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				authType: 'authToken',
				authToken: testAuthToken,
			});
			const tamperedHash = createHash('sha256').update('tampered').digest('hex');
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockReturnValue(validSignature),
				query: { bodySHA256: tamperedHash },
				rawBody: Buffer.from(testBody),
				originalUrl: `/webhook/abc/webhook?bodySHA256=${tamperedHash}`,
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});

		it('should return false when raw body is missing', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				authType: 'authToken',
				authToken: testAuthToken,
			});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockReturnValue(validSignature),
				query: { bodySHA256: testBodyHash },
				rawBody: undefined,
				originalUrl: `/webhook/abc/webhook?${queryString}`,
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});

		it('should return false when getCredentials throws', async () => {
			mockWebhookFunctions.getCredentials.mockRejectedValue(new Error('credential lookup failed'));

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});

		it('should return true in test mode when signature matches test URL', async () => {
			const testSinkUrl = 'https://n8n.example.com/webhook-test/abc/webhook';
			const testSignedUrl = `${testSinkUrl}?${queryString}`;
			const testModeSignature = createHmac('sha1', testAuthToken)
				.update(testSignedUrl)
				.digest('base64');

			mockWebhookFunctions.getCredentials.mockResolvedValue({
				authType: 'authToken',
				authToken: testAuthToken,
			});
			// getNodeWebhookUrl returns the production URL
			mockWebhookFunctions.getNodeWebhookUrl.mockReturnValue(sinkUrl);
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockImplementation((name: string) => {
					if (name === 'x-twilio-signature') return testModeSignature;
					return null;
				}),
				query: { bodySHA256: testBodyHash },
				rawBody: Buffer.from(testBody),
				// Request arrives at the test URL
				originalUrl: `/webhook-test/abc/webhook?${queryString}`,
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});

		it('should accept rawBody as a string', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				authType: 'authToken',
				authToken: testAuthToken,
			});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockReturnValue(validSignature),
				query: { bodySHA256: testBodyHash },
				rawBody: testBody,
				originalUrl: `/webhook/abc/webhook?${queryString}`,
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});
	});
});
