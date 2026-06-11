import { createHmac } from 'crypto';
import { verifySignature } from '../LinearTriggerHelpers';

describe('LinearTriggerHelpers', () => {
	let mockWebhookFunctions: any;
	const testSigningSecret = 'test-linear-signing-secret';
	const testBody = '{"action":"create","type":"Issue","data":{"id":"123"}}';
	const testSignature = createHmac('sha256', testSigningSecret).update(testBody).digest('hex');

	beforeEach(() => {
		jest.clearAllMocks();

		// Mock Date.now() to a fixed timestamp
		jest.spyOn(Date, 'now').mockImplementation(() => 1700000000000);

		mockWebhookFunctions = {
			getCredentials: jest.fn(),
			getRequestObject: jest.fn(),
			getNodeParameter: jest.fn(),
			getBodyData: jest.fn().mockReturnValue({ webhookTimestamp: 1700000000000 }),
			getNode: jest.fn().mockReturnValue({ name: 'Linear Trigger' }),
		};

		mockWebhookFunctions.getNodeParameter.mockReturnValue('apiToken');

		mockWebhookFunctions.getRequestObject.mockReturnValue({
			header: jest.fn().mockImplementation((header: string) => {
				if (header === 'linear-signature') return testSignature;
				return null;
			}),
			rawBody: testBody,
		});
	});

	describe('verifySignature', () => {
		it('should return true when no signing secret is configured', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				apiKey: 'test-key',
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
			expect(mockWebhookFunctions.getCredentials).toHaveBeenCalledWith('linearApi');
		});

		it('should use linearOAuth2Api credentials when authentication is oAuth2', async () => {
			mockWebhookFunctions.getNodeParameter.mockReturnValue('oAuth2');
			mockWebhookFunctions.getCredentials.mockResolvedValue({});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
			expect(mockWebhookFunctions.getCredentials).toHaveBeenCalledWith('linearOAuth2Api');
		});

		it('should return false when Linear-Signature header is missing', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				signingSecret: testSigningSecret,
			});

			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockReturnValue(null),
				rawBody: testBody,
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});

		it('should return true when empty signing secret and no header', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				signingSecret: '',
			});

			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockReturnValue(null),
				rawBody: testBody,
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});

		it('should return true when signature is valid', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				signingSecret: testSigningSecret,
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});

		it('should return false when signature is invalid', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				signingSecret: testSigningSecret,
			});

			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockImplementation((header: string) => {
					if (header === 'linear-signature') return 'invalidsignature';
					return null;
				}),
				rawBody: testBody,
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});

		it('should return false when webhookTimestamp is too old', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				signingSecret: testSigningSecret,
			});

			// Timestamp 120 seconds old (Should be within 60s window)
			mockWebhookFunctions.getBodyData.mockReturnValue({
				webhookTimestamp: 1700000000000 - 120_000,
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});

		it('should return true when webhookTimestamp difference is within acceptable window', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				signingSecret: testSigningSecret,
			});

			// Timestamp 30 seconds old
			mockWebhookFunctions.getBodyData.mockReturnValue({
				webhookTimestamp: 1700000000000 - 30_000,
			});

			const result = await verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});
	});
});
