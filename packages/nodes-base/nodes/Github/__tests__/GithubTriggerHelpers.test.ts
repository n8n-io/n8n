import { createHmac, timingSafeEqual } from 'crypto';
import { verifySignature } from '../GithubTriggerHelpers';
import type { Mock } from 'vitest';
import type * as _importType0 from 'crypto';

vi.mock('crypto', async () => ({
	...(await vi.importActual<typeof _importType0>('crypto')),
	createHmac: vi.fn().mockReturnValue({
		update: vi.fn().mockReturnThis(),
		digest: vi
			.fn()
			.mockReturnValue('757107ea0eb2509fc211221cce984b8a37570b6d7586c22c46f4379c8b043e17'),
	}),
	timingSafeEqual: vi.fn(),
}));

describe('GithubTriggerHelpers', () => {
	let mockWebhookFunctions: {
		getWorkflowStaticData: Mock;
		getRequestObject: Mock;
	};
	const testWebhookSecret = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
	const testBody =
		'{"action":"opened","pull_request":{"id":123},"repository":{"full_name":"owner/repo"}}';
	const testSignature = 'sha256=757107ea0eb2509fc211221cce984b8a37570b6d7586c22c46f4379c8b043e17';

	beforeEach(() => {
		vi.clearAllMocks();

		mockWebhookFunctions = {
			getWorkflowStaticData: vi.fn(),
			getRequestObject: vi.fn(),
		};

		// Default mock return values
		mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
			webhookSecret: testWebhookSecret,
		});

		mockWebhookFunctions.getRequestObject.mockReturnValue({
			header: vi.fn().mockImplementation((header) => {
				if (header === 'x-hub-signature-256') return testSignature;
				return null;
			}),
			rawBody: testBody,
		});
	});

	describe('verifySignature', () => {
		it('should return true when no webhook secret is stored (backwards compatibility)', () => {
			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({});

			const result = verifySignature.call(mockWebhookFunctions as never);

			expect(result).toBe(true);
			expect(mockWebhookFunctions.getWorkflowStaticData).toHaveBeenCalledWith('node');
		});

		it('should return false when signature header is missing', () => {
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: vi.fn().mockReturnValue(null),
				rawBody: testBody,
			});

			const result = verifySignature.call(mockWebhookFunctions as never);

			expect(result).toBe(false);
		});

		it('should return false when signature does not start with sha256=', () => {
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: vi.fn().mockImplementation((header) => {
					if (header === 'x-hub-signature-256') return 'invalid-format-signature';
					return null;
				}),
				rawBody: testBody,
			});

			const result = verifySignature.call(mockWebhookFunctions as never);

			expect(result).toBe(false);
		});

		it('should return false when rawBody is missing', () => {
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: vi.fn().mockImplementation((header) => {
					if (header === 'x-hub-signature-256') return testSignature;
					return null;
				}),
				rawBody: undefined,
			});

			const result = verifySignature.call(mockWebhookFunctions as never);

			expect(result).toBe(false);
		});

		it('should return true when signature is valid', () => {
			(timingSafeEqual as Mock).mockReturnValue(true);

			const result = verifySignature.call(mockWebhookFunctions as never);

			expect(result).toBe(true);
			expect(createHmac).toHaveBeenCalledWith('sha256', testWebhookSecret);
			expect(timingSafeEqual).toHaveBeenCalled();
		});

		it('should return false when signature is invalid', () => {
			(timingSafeEqual as Mock).mockReturnValue(false);

			const result = verifySignature.call(mockWebhookFunctions as never);

			expect(result).toBe(false);
			expect(createHmac).toHaveBeenCalledWith('sha256', testWebhookSecret);
			expect(timingSafeEqual).toHaveBeenCalled();
		});

		it('should handle Buffer rawBody correctly', () => {
			const bufferBody = Buffer.from(testBody);
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: vi.fn().mockImplementation((header) => {
					if (header === 'x-hub-signature-256') return testSignature;
					return null;
				}),
				rawBody: bufferBody,
			});
			(timingSafeEqual as Mock).mockReturnValue(true);

			const result = verifySignature.call(mockWebhookFunctions as never);

			expect(result).toBe(true);
			const mockHmac = createHmac('sha256', testWebhookSecret);
			expect(mockHmac.update).toHaveBeenCalledWith(bufferBody);
		});

		it('should return false when computed and provided signatures have different lengths', () => {
			// Mock a different length signature
			const mockHmacInstance = {
				update: vi.fn().mockReturnThis(),
				digest: vi.fn().mockReturnValue('short'),
			};
			(createHmac as Mock).mockReturnValue(mockHmacInstance);

			const result = verifySignature.call(mockWebhookFunctions as never);

			expect(result).toBe(false);
			// timingSafeEqual should not be called if lengths don't match
			expect(timingSafeEqual).not.toHaveBeenCalled();
		});

		it('should return false when an error occurs during verification', () => {
			(createHmac as Mock).mockImplementation(() => {
				throw new Error('Crypto error');
			});

			const result = verifySignature.call(mockWebhookFunctions as never);

			expect(result).toBe(false);
		});
	});
});
