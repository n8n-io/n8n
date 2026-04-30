import { createHmac } from 'crypto';

import { verifySignature } from '../TaigaTriggerHelpers';

describe('TaigaTriggerHelpers', () => {
	let mockWebhookFunctions: any;
	const testKey = 'taiga-webhook-key-abc123';
	const testPayload = Buffer.from('{"action":"create","type":"issue"}');

	beforeEach(() => {
		jest.clearAllMocks();

		mockWebhookFunctions = {
			getRequestObject: jest.fn(),
			getWorkflowStaticData: jest.fn(),
		};
	});

	describe('verifySignature', () => {
		it('should return true if no key is stored (backward compatibility)', () => {
			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockReturnValue(null),
				rawBody: testPayload,
			});

			expect(verifySignature.call(mockWebhookFunctions)).toBe(true);
		});

		it('should return true when signatures match', () => {
			const expectedSignature = createHmac('sha1', testKey).update(testPayload).digest('hex');

			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({ key: testKey });
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockImplementation((name: string) => {
					if (name === 'x-taiga-webhook-signature') return expectedSignature;
					return null;
				}),
				rawBody: testPayload,
			});

			expect(verifySignature.call(mockWebhookFunctions)).toBe(true);
		});

		it('should return false when signatures do not match', () => {
			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({ key: testKey });
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockImplementation((name: string) => {
					if (name === 'x-taiga-webhook-signature') return 'a'.repeat(40);
					return null;
				}),
				rawBody: testPayload,
			});

			expect(verifySignature.call(mockWebhookFunctions)).toBe(false);
		});

		it('should return false when signature header is missing', () => {
			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({ key: testKey });
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockReturnValue(null),
				rawBody: testPayload,
			});

			expect(verifySignature.call(mockWebhookFunctions)).toBe(false);
		});

		it('should return false when raw body is missing', () => {
			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({ key: testKey });
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockReturnValue('a'.repeat(40)),
				rawBody: undefined,
			});

			expect(verifySignature.call(mockWebhookFunctions)).toBe(false);
		});
	});
});
