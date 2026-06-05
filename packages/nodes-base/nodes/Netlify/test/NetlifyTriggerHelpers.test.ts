import { createHash } from 'crypto';
import jwt from 'jsonwebtoken';

import { verifySignature } from '../NetlifyTriggerHelpers';

describe('NetlifyTriggerHelpers', () => {
	let mockWebhookFunctions: any;
	const testSecret = 'test-secret-key-12345';
	const testPayload = Buffer.from('{"event":"deploy_created"}');

	const signPayload = (secret: string, payload: Buffer) => {
		const sha256 = createHash('sha256').update(payload).digest('hex');
		return jwt.sign({ sha256 }, secret, {
			algorithm: 'HS256',
			issuer: 'netlify',
		});
	};

	beforeEach(() => {
		jest.clearAllMocks();

		mockWebhookFunctions = {
			getRequestObject: jest.fn(),
			getWorkflowStaticData: jest.fn(),
		};
	});

	describe('verifySignature', () => {
		it('should return true when no secret is configured', () => {
			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockReturnValue(null),
				rawBody: testPayload,
			});

			const result = verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});

		it('should return true when signature is valid', () => {
			const token = signPayload(testSecret, testPayload);

			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
				webhookSecret: testSecret,
			});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockImplementation((name) => {
					if (name === 'x-webhook-signature') return token;
					return null;
				}),
				rawBody: testPayload,
			});

			const result = verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(true);
		});

		it('should return false when JWT was signed with a different secret', () => {
			const token = signPayload('wrong-secret', testPayload);

			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
				webhookSecret: testSecret,
			});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockImplementation((name) => {
					if (name === 'x-webhook-signature') return token;
					return null;
				}),
				rawBody: testPayload,
			});

			const result = verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});

		it('should return false when body digest does not match the signed claim', () => {
			const token = signPayload(testSecret, Buffer.from('{"event":"other"}'));

			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
				webhookSecret: testSecret,
			});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockImplementation((name) => {
					if (name === 'x-webhook-signature') return token;
					return null;
				}),
				rawBody: testPayload,
			});

			const result = verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});

		it('should return false when JWT was issued by a different party', () => {
			const sha256 = createHash('sha256').update(testPayload).digest('hex');
			const token = jwt.sign({ sha256 }, testSecret, {
				algorithm: 'HS256',
				issuer: 'someone-else',
			});

			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
				webhookSecret: testSecret,
			});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockImplementation((name) => {
					if (name === 'x-webhook-signature') return token;
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

		it('should return false when signature header is malformed', () => {
			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
				webhookSecret: testSecret,
			});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockImplementation((name) => {
					if (name === 'x-webhook-signature') return 'not-a-jwt';
					return null;
				}),
				rawBody: testPayload,
			});

			const result = verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});

		it('should return false when raw body is missing', () => {
			const token = signPayload(testSecret, testPayload);

			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
				webhookSecret: testSecret,
			});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				header: jest.fn().mockImplementation((name) => {
					if (name === 'x-webhook-signature') return token;
					return null;
				}),
				rawBody: undefined,
			});

			const result = verifySignature.call(mockWebhookFunctions);

			expect(result).toBe(false);
		});
	});
});
