import { createHmac } from 'crypto';

import { verifySignature } from '../../v2/MailerLiteTriggerHelpers';

describe('MailerLiteTriggerHelpers', () => {
	let mockWebhookFunctions: any;
	const testSecret = 'test-secret-key-12345';
	const testPayload = Buffer.from('{"events":[{"type":"subscriber.created"}]}');

	beforeEach(() => {
		jest.clearAllMocks();

		mockWebhookFunctions = {
			getRequestObject: jest.fn(),
			getWorkflowStaticData: jest.fn(),
		};
	});

	describe('verifySignature', () => {
		it('should return true if no secret is configured', () => {
			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockReturnValue(null),
				rawBody: testPayload,
			});

			const result = verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});

		it('should return true when signatures match', () => {
			const hmac = createHmac('sha256', testSecret);
			hmac.update(testPayload);
			const expectedSignature = hmac.digest('hex');

			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
				webhookSecret: testSecret,
			});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockImplementation((header) => {
					if (header === 'signature') return expectedSignature;
					return null;
				}),
				rawBody: testPayload,
			});

			const result = verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});

		it('should return false when signatures do not match', () => {
			const wrongSignature = 'a'.repeat(64);

			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
				webhookSecret: testSecret,
			});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockImplementation((header) => {
					if (header === 'signature') return wrongSignature;
					return null;
				}),
				rawBody: testPayload,
			});

			const result = verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});

		it('should return false when signature header is missing', () => {
			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
				webhookSecret: testSecret,
			});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockReturnValue(null),
				rawBody: testPayload,
			});

			const result = verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});

		it('should return false when secret is configured but rawBody is missing', () => {
			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
				webhookSecret: testSecret,
			});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockReturnValue('any-signature'),
				rawBody: undefined,
			});

			const result = verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});
	});
});
