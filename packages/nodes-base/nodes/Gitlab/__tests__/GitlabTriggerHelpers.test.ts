import type { IDataObject, IWebhookFunctions } from 'n8n-workflow';

import { generateWebhookSecret, verifySignature } from '../GitlabTriggerHelpers';

describe('GitlabTriggerHelpers', () => {
	describe('generateWebhookSecret', () => {
		it('should generate a 64-character hex string', () => {
			const secret = generateWebhookSecret();
			expect(secret).toHaveLength(64);
			expect(/^[0-9a-f]+$/.test(secret)).toBe(true);
		});

		it('should generate unique secrets', () => {
			const secret1 = generateWebhookSecret();
			const secret2 = generateWebhookSecret();
			expect(secret1).not.toBe(secret2);
		});
	});

	describe('verifySignature', () => {
		let mockWebhookFunctions: Partial<IWebhookFunctions>;

		beforeEach(() => {
			mockWebhookFunctions = {
				getHeaderData: jest.fn(),
				getWorkflowStaticData: jest.fn(),
			};
		});

		it('should return true when no secret is stored (backward compatibility)', () => {
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({});
			(mockWebhookFunctions.getWorkflowStaticData as jest.Mock).mockReturnValue({});

			const result = verifySignature.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(true);
		});

		it('should return true when token matches stored secret', () => {
			const secret = 'auto-generated-secret';

			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({
				'x-gitlab-token': secret,
			});
			(mockWebhookFunctions.getWorkflowStaticData as jest.Mock).mockReturnValue({
				webhookSecret: secret,
			} as IDataObject);

			const result = verifySignature.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(true);
		});

		it('should return false when token does not match (different length)', () => {
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({
				'x-gitlab-token': 'wrong',
			});
			(mockWebhookFunctions.getWorkflowStaticData as jest.Mock).mockReturnValue({
				webhookSecret: 'correct-secret',
			} as IDataObject);

			const result = verifySignature.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(false);
		});

		it('should return false when token does not match (same length)', () => {
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({
				'x-gitlab-token': 'wrong-secret-aa',
			});
			(mockWebhookFunctions.getWorkflowStaticData as jest.Mock).mockReturnValue({
				webhookSecret: 'correct-secret-',
			} as IDataObject);

			const result = verifySignature.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(false);
		});

		it('should return false when token header is missing but secret is stored', () => {
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({});
			(mockWebhookFunctions.getWorkflowStaticData as jest.Mock).mockReturnValue({
				webhookSecret: 'expected-secret',
			} as IDataObject);

			const result = verifySignature.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(false);
		});

		it('should return false when token header has wrong type', () => {
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue({
				'x-gitlab-token': ['unexpected-array'],
			});
			(mockWebhookFunctions.getWorkflowStaticData as jest.Mock).mockReturnValue({
				webhookSecret: 'expected-secret',
			} as IDataObject);

			const result = verifySignature.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(false);
		});
	});
});
