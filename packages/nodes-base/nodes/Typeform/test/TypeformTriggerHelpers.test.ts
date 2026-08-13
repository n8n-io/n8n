import { createHmac } from 'crypto';

import { verifySignature } from '../TypeformTriggerHelpers';

describe('TypeformTriggerHelpers', () => {
	let mockWebhookFunctions: any;
	const testSecret = 'test-secret-key-12345';
	const testPayload = Buffer.from('{"event":"form_response"}');

	beforeEach(() => {
		vi.clearAllMocks();

		mockWebhookFunctions = {
			getRequestObject: vi.fn(),
			getWorkflowStaticData: vi.fn(),
		};
	});

	describe('verifySignature', () => {
		it('should return true if no signature exists', () => {
			// No secret configured
			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: vi.fn().mockReturnValue(null),
				rawBody: testPayload,
			});

			const result = verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});

		it('should return true if signatures match', () => {
			// Compute the expected signature
			const hmac = createHmac('sha256', testSecret);
			hmac.update(testPayload);
			const expectedSignature = `sha256=${hmac.digest('base64')}`;

			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
				webhookSecret: testSecret,
			});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: vi.fn().mockImplementation((header) => {
					if (header === 'typeform-signature') return expectedSignature;
					return null;
				}),
				rawBody: testPayload,
			});

			const result = verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});

		it('should return false if signatures do not match', () => {
			// Use a different signature that won't match
			const wrongSignature = 'sha256=wrongsignature1234567890';

			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
				webhookSecret: testSecret,
			});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: vi.fn().mockImplementation((header) => {
					if (header === 'typeform-signature') return wrongSignature;
					return null;
				}),
				rawBody: testPayload,
			});

			const result = verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});
	});
});
