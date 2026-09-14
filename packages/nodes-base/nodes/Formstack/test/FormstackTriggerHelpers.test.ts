import { createHmac } from 'crypto';

import { verifySignature } from '../FormstackTriggerHelpers';

describe('FormstackTriggerHelpers', () => {
	let mockWebhookFunctions: any;
	const testSecret = 'test-secret-key-12345';
	const testPayload = Buffer.from('{"FormID":"123","UniqueID":"abc"}');

	beforeEach(() => {
		vi.clearAllMocks();

		mockWebhookFunctions = {
			getRequestObject: vi.fn(),
			getWorkflowStaticData: vi.fn(),
		};
	});

	describe('verifySignature', () => {
		it('should return true when no secret is configured', () => {
			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: vi.fn().mockReturnValue(null),
				rawBody: testPayload,
			});

			const result = verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});

		it('should return true when signatures match', () => {
			const hmac = createHmac('sha256', testSecret);
			hmac.update(testPayload);
			const expectedSignature = `sha256=${hmac.digest('hex')}`;

			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
				webhookSecret: testSecret,
			});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: vi.fn().mockImplementation((header) => {
					if (header === 'x-fs-signature') return expectedSignature;
					return null;
				}),
				rawBody: testPayload,
			});

			const result = verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});

		it('should return false when signatures do not match', () => {
			const wrongSignature = `sha256=${'0'.repeat(64)}`;

			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
				webhookSecret: testSecret,
			});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: vi.fn().mockImplementation((header) => {
					if (header === 'x-fs-signature') return wrongSignature;
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
				header: vi.fn().mockReturnValue(null),
				rawBody: testPayload,
			});

			const result = verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});

		it('should return false when raw body is missing', () => {
			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
				webhookSecret: testSecret,
			});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: vi.fn().mockReturnValue('sha256=anything'),
				rawBody: undefined,
			});

			const result = verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});
	});
});
