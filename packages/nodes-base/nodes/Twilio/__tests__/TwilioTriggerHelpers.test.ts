import { createHmac, createHash, timingSafeEqual } from 'crypto';
import { verifySignature } from '../TwilioTriggerHelpers';

jest.mock('crypto', () => ({
	...jest.requireActual('crypto'),
	createHmac: jest.fn().mockReturnValue({
		update: jest.fn().mockReturnThis(),
		digest: jest.fn().mockReturnValue('GxVchyDnq5TeTNrQjvRwST4VaEc='),
	}),
	createHash: jest.fn().mockReturnValue({
		update: jest.fn().mockReturnThis(),
		digest: jest
			.fn()
			.mockReturnValue('5ccde7145dfb8f56479710896586cb9d5911809d83afbe34627818790db0aec9'),
	}),
	timingSafeEqual: jest.fn(),
}));

describe('TwilioTriggerHelpers', () => {
	let mockWebhookFunctions: {
		getCredentials: jest.Mock;
		getRequestObject: jest.Mock;
		getNodeWebhookUrl: jest.Mock;
		getBodyData: jest.Mock;
	};
	const testAuthToken = 'test_auth_token_12345';
	const testWebhookUrl = 'https://example.com/webhook/twiliotrigger';
	const testFormBody = {
		CallSid: 'CA1234567890ABCDE',
		From: '+14158675310',
		To: '+18005551212',
	};
	const testJsonBody = '{"event":"message","data":{"id":"123"}}';
	const testSignature = 'GxVchyDnq5TeTNrQjvRwST4VaEc=';

	beforeEach(() => {
		jest.clearAllMocks();

		mockWebhookFunctions = {
			getCredentials: jest.fn(),
			getRequestObject: jest.fn(),
			getNodeWebhookUrl: jest.fn().mockReturnValue(testWebhookUrl),
			getBodyData: jest.fn().mockReturnValue(testFormBody),
		};

		// Default mock return values for form-urlencoded request
		mockWebhookFunctions.getRequestObject.mockReturnValue({
			header: jest.fn().mockImplementation((header) => {
				if (header === 'x-twilio-signature') return testSignature;
				if (header === 'content-type') return 'application/x-www-form-urlencoded';
				return null;
			}),
			rawBody: 'CallSid=CA1234567890ABCDE&From=%2B14158675310&To=%2B18005551212',
		});
	});

	describe('verifySignature', () => {
		it('should return true when using API Key auth type (skip verification)', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				authType: 'apiKey',
				apiKeySid: 'test-api-key',
				apiKeySecret: 'test-api-secret',
			});

			const result = await verifySignature.call(mockWebhookFunctions as never);

			expect(result).toBe(true);
			expect(mockWebhookFunctions.getCredentials).toHaveBeenCalledWith('twilioApi');
		});

		it('should return true when no auth token is configured (backwards compatibility)', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				authType: 'authToken',
				accountSid: 'test-account-sid',
				authToken: '',
			});

			const result = await verifySignature.call(mockWebhookFunctions as never);

			expect(result).toBe(true);
		});

		it('should return false when signature header is missing', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				authType: 'authToken',
				accountSid: 'test-account-sid',
				authToken: testAuthToken,
			});

			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockImplementation((header) => {
					if (header === 'content-type') return 'application/x-www-form-urlencoded';
					return null;
				}),
				rawBody: 'test',
			});

			const result = await verifySignature.call(mockWebhookFunctions as never);

			expect(result).toBe(false);
		});

		it('should return false when webhook URL is not available', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				authType: 'authToken',
				accountSid: 'test-account-sid',
				authToken: testAuthToken,
			});
			mockWebhookFunctions.getNodeWebhookUrl.mockReturnValue(undefined);

			const result = await verifySignature.call(mockWebhookFunctions as never);

			expect(result).toBe(false);
		});

		it('should return true when signature is valid for form-urlencoded body', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				authType: 'authToken',
				accountSid: 'test-account-sid',
				authToken: testAuthToken,
			});
			(timingSafeEqual as jest.Mock).mockReturnValue(true);

			const result = await verifySignature.call(mockWebhookFunctions as never);

			expect(result).toBe(true);
			expect(createHmac).toHaveBeenCalledWith('sha1', testAuthToken);
			expect(timingSafeEqual).toHaveBeenCalled();
		});

		it('should return false when signature is invalid', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				authType: 'authToken',
				accountSid: 'test-account-sid',
				authToken: testAuthToken,
			});
			(timingSafeEqual as jest.Mock).mockReturnValue(false);

			const result = await verifySignature.call(mockWebhookFunctions as never);

			expect(result).toBe(false);
			expect(createHmac).toHaveBeenCalledWith('sha1', testAuthToken);
			expect(timingSafeEqual).toHaveBeenCalled();
		});

		it('should sort POST parameters alphabetically for form-urlencoded body', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				authType: 'authToken',
				accountSid: 'test-account-sid',
				authToken: testAuthToken,
			});
			mockWebhookFunctions.getBodyData.mockReturnValue({
				CallSid: 'CA123',
				From: '+1234',
				To: '+5678',
			});
			(timingSafeEqual as jest.Mock).mockReturnValue(true);

			await verifySignature.call(mockWebhookFunctions as never);

			expect(createHmac).toHaveBeenCalledWith('sha1', testAuthToken);
			const mockHmac = createHmac('sha1', testAuthToken);
			// Parameters should be sorted: CallSid, From, To
			expect(mockHmac.update).toHaveBeenCalledWith(`${testWebhookUrl}CallSidCA123From+1234To+5678`);
		});

		it('should handle JSON body with bodySHA256 parameter', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				authType: 'authToken',
				accountSid: 'test-account-sid',
				authToken: testAuthToken,
			});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockImplementation((header) => {
					if (header === 'x-twilio-signature') return testSignature;
					if (header === 'content-type') return 'application/json';
					return null;
				}),
				rawBody: testJsonBody,
			});
			(timingSafeEqual as jest.Mock).mockReturnValue(true);

			await verifySignature.call(mockWebhookFunctions as never);

			expect(createHash).toHaveBeenCalledWith('sha256');
			expect(createHmac).toHaveBeenCalledWith('sha1', testAuthToken);
		});

		it('should return false when JSON body rawBody is missing', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				authType: 'authToken',
				accountSid: 'test-account-sid',
				authToken: testAuthToken,
			});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockImplementation((header) => {
					if (header === 'x-twilio-signature') return testSignature;
					if (header === 'content-type') return 'application/json';
					return null;
				}),
				rawBody: undefined,
			});

			const result = await verifySignature.call(mockWebhookFunctions as never);

			expect(result).toBe(false);
		});

		it('should handle Buffer rawBody correctly for JSON', async () => {
			const bufferBody = Buffer.from(testJsonBody);
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				authType: 'authToken',
				accountSid: 'test-account-sid',
				authToken: testAuthToken,
			});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockImplementation((header) => {
					if (header === 'x-twilio-signature') return testSignature;
					if (header === 'content-type') return 'application/json';
					return null;
				}),
				rawBody: bufferBody,
			});
			(timingSafeEqual as jest.Mock).mockReturnValue(true);

			const result = await verifySignature.call(mockWebhookFunctions as never);

			expect(result).toBe(true);
		});

		it('should return false when computed and provided signatures have different lengths', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				authType: 'authToken',
				accountSid: 'test-account-sid',
				authToken: testAuthToken,
			});
			// Mock a different length signature
			const mockHmacInstance = {
				update: jest.fn().mockReturnThis(),
				digest: jest.fn().mockReturnValue('short'),
			};
			(createHmac as jest.Mock).mockReturnValue(mockHmacInstance);

			const result = await verifySignature.call(mockWebhookFunctions as never);

			expect(result).toBe(false);
			// timingSafeEqual should not be called if lengths don't match
			expect(timingSafeEqual).not.toHaveBeenCalled();
		});

		it('should return false when an error occurs during verification', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				authType: 'authToken',
				accountSid: 'test-account-sid',
				authToken: testAuthToken,
			});
			(createHmac as jest.Mock).mockImplementation(() => {
				throw new Error('Crypto error');
			});

			const result = await verifySignature.call(mockWebhookFunctions as never);

			expect(result).toBe(false);
		});
	});
});
