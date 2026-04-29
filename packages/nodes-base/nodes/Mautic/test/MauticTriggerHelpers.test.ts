import { createHmac } from 'crypto';

import { verifySignature } from '../MauticTriggerHelpers';

describe('MauticTriggerHelpers', () => {
	let mockWebhookFunctions: any;
	const testSecret = 'test-secret-key-12345';
	const testPayload = Buffer.from('{"mautic.lead_post_save_new":[{"id":1}]}');

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

		it('should return true if signatures match', () => {
			const hmac = createHmac('sha256', testSecret);
			hmac.update(testPayload);
			const expectedSignature = hmac.digest('base64');

			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
				webhookSecret: testSecret,
			});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockImplementation((header) => {
					if (header === 'webhook-signature') return expectedSignature;
					return null;
				}),
				rawBody: testPayload,
			});

			const result = verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});

		it('should return false if signatures do not match', () => {
			const wrongSignature = 'wrongsignature1234567890';

			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
				webhookSecret: testSecret,
			});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockImplementation((header) => {
					if (header === 'webhook-signature') return wrongSignature;
					return null;
				}),
				rawBody: testPayload,
			});

			const result = verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});

		it('should return false if signature header is missing', () => {
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

		it('should return false if raw body is missing', () => {
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
