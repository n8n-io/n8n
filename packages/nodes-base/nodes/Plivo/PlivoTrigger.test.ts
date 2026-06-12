import { createHmac } from 'crypto';

import { mock } from 'jest-mock-extended';
import type { IWebhookFunctions, INodeType } from 'n8n-workflow';

import { PlivoTrigger } from './PlivoTrigger.node';
import { detectEventType, verifyPlivoSignature } from './PlivoTriggerHelpers';

// Mock the helper functions
jest.mock('./PlivoTriggerHelpers', () => ({
	verifyPlivoSignature: jest.fn(),
	detectEventType: jest.fn(),
}));

describe('PlivoTrigger Node', () => {
	let plivoTrigger: INodeType;
	let mockWebhookFunctions: ReturnType<typeof mock<IWebhookFunctions>>;
	let mockResponse: {
		status: jest.Mock;
		send: jest.Mock;
		json: jest.Mock;
		end: jest.Mock;
	};

	beforeEach(() => {
		jest.clearAllMocks();
		plivoTrigger = new PlivoTrigger();

		mockWebhookFunctions = mock<IWebhookFunctions>();

		mockResponse = {
			status: jest.fn().mockReturnThis(),
			send: jest.fn().mockReturnThis(),
			json: jest.fn().mockReturnThis(),
			end: jest.fn(),
		};

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		mockWebhookFunctions.getResponseObject.mockReturnValue(mockResponse as any);

		// Mock helpers.returnJsonArray
		mockWebhookFunctions.helpers = {
			returnJsonArray: jest.fn((data) => [{ json: data }]),
		} as unknown as IWebhookFunctions['helpers'];

		// Default: signature validation enabled and valid
		(verifyPlivoSignature as jest.Mock).mockResolvedValue(true);
	});

	describe('webhook method - signature validation', () => {
		it('should reject request with invalid signature when validation is enabled', async () => {
			(verifyPlivoSignature as jest.Mock).mockResolvedValue(false);
			(detectEventType as jest.Mock).mockReturnValue('incomingSms');

			mockWebhookFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'validateSignature') return true;
				if (paramName === 'events') return ['incomingSms'];
				return undefined;
			});

			mockWebhookFunctions.getBodyData.mockReturnValue({
				MessageUUID: 'msg-123',
				Text: 'Hello',
			});

			const result = await plivoTrigger.webhook!.call(mockWebhookFunctions);

			expect(mockResponse.status).toHaveBeenCalledWith(401);
			expect(mockResponse.send).toHaveBeenCalledWith('Unauthorized: Invalid signature');
			expect(result.noWebhookResponse).toBe(true);
		});

		it('should accept request with valid signature when validation is enabled', async () => {
			(verifyPlivoSignature as jest.Mock).mockResolvedValue(true);
			(detectEventType as jest.Mock).mockReturnValue('incomingSms');

			mockWebhookFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'validateSignature') return true;
				if (paramName === 'events') return ['incomingSms'];
				return undefined;
			});

			const bodyData = {
				MessageUUID: 'msg-123',
				From: '+14155551234',
				To: '+14155555678',
				Text: 'Hello',
			};
			mockWebhookFunctions.getBodyData.mockReturnValue(bodyData);

			const result = await plivoTrigger.webhook!.call(mockWebhookFunctions);

			expect(result.workflowData).toBeDefined();
			expect(mockWebhookFunctions.helpers.returnJsonArray).toHaveBeenCalledWith({
				...bodyData,
				_eventType: 'incomingSms',
			});
		});

		it('should skip signature validation when disabled', async () => {
			(detectEventType as jest.Mock).mockReturnValue('incomingSms');

			mockWebhookFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'validateSignature') return false;
				if (paramName === 'events') return ['incomingSms'];
				return undefined;
			});

			const bodyData = {
				MessageUUID: 'msg-123',
				Text: 'Hello',
			};
			mockWebhookFunctions.getBodyData.mockReturnValue(bodyData);

			const result = await plivoTrigger.webhook!.call(mockWebhookFunctions);

			expect(verifyPlivoSignature).not.toHaveBeenCalled();
			expect(result.workflowData).toBeDefined();
		});
	});

	describe('webhook method - event filtering', () => {
		beforeEach(() => {
			(verifyPlivoSignature as jest.Mock).mockResolvedValue(true);
		});

		it('should process incoming SMS when subscribed', async () => {
			(detectEventType as jest.Mock).mockReturnValue('incomingSms');

			mockWebhookFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'validateSignature') return true;
				if (paramName === 'events') return ['incomingSms'];
				return undefined;
			});

			const bodyData = {
				MessageUUID: 'msg-123',
				From: '+14155551234',
				To: '+14155555678',
				Text: 'Test message',
				Type: 'sms',
			};
			mockWebhookFunctions.getBodyData.mockReturnValue(bodyData);

			const result = await plivoTrigger.webhook!.call(mockWebhookFunctions);

			expect(result.workflowData).toBeDefined();
			expect(mockWebhookFunctions.helpers.returnJsonArray).toHaveBeenCalledWith({
				...bodyData,
				_eventType: 'incomingSms',
			});
		});

		it('should ignore events not subscribed to', async () => {
			(detectEventType as jest.Mock).mockReturnValue('smsStatus');

			mockWebhookFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'validateSignature') return true;
				if (paramName === 'events') return ['incomingSms']; // Only subscribed to incomingSms
				return undefined;
			});

			mockWebhookFunctions.getBodyData.mockReturnValue({
				MessageUUID: 'msg-123',
				Status: 'delivered',
			});

			const result = await plivoTrigger.webhook!.call(mockWebhookFunctions);

			// Should return empty result for unsubscribed events
			expect(result).toEqual({});
		});

		it('should process SMS delivery status when subscribed', async () => {
			(detectEventType as jest.Mock).mockReturnValue('smsStatus');

			mockWebhookFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'validateSignature') return true;
				if (paramName === 'events') return ['smsStatus'];
				return undefined;
			});

			const bodyData = {
				MessageUUID: 'msg-123',
				From: '+14155551234',
				To: '+14155555678',
				Status: 'delivered',
			};
			mockWebhookFunctions.getBodyData.mockReturnValue(bodyData);

			const result = await plivoTrigger.webhook!.call(mockWebhookFunctions);

			expect(result.workflowData).toBeDefined();
			expect(mockWebhookFunctions.helpers.returnJsonArray).toHaveBeenCalledWith({
				...bodyData,
				_eventType: 'smsStatus',
			});
		});

		it('should process incoming call when subscribed', async () => {
			(detectEventType as jest.Mock).mockReturnValue('incomingCall');

			mockWebhookFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'validateSignature') return true;
				if (paramName === 'events') return ['incomingCall'];
				return undefined;
			});

			const bodyData = {
				CallUUID: 'call-123',
				From: '+14155551234',
				To: '+14155555678',
				CallStatus: 'ringing',
				Direction: 'inbound',
			};
			mockWebhookFunctions.getBodyData.mockReturnValue(bodyData);

			const result = await plivoTrigger.webhook!.call(mockWebhookFunctions);

			expect(result.workflowData).toBeDefined();
			expect(mockWebhookFunctions.helpers.returnJsonArray).toHaveBeenCalledWith({
				...bodyData,
				_eventType: 'incomingCall',
			});
		});

		it('should process call status update when subscribed', async () => {
			(detectEventType as jest.Mock).mockReturnValue('callStatus');

			mockWebhookFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'validateSignature') return true;
				if (paramName === 'events') return ['callStatus'];
				return undefined;
			});

			const bodyData = {
				CallUUID: 'call-123',
				From: '+14155551234',
				To: '+14155555678',
				CallStatus: 'completed',
				Direction: 'outbound',
				Duration: '45',
			};
			mockWebhookFunctions.getBodyData.mockReturnValue(bodyData);

			const result = await plivoTrigger.webhook!.call(mockWebhookFunctions);

			expect(result.workflowData).toBeDefined();
			expect(mockWebhookFunctions.helpers.returnJsonArray).toHaveBeenCalledWith({
				...bodyData,
				_eventType: 'callStatus',
			});
		});

		it('should handle multiple event subscriptions', async () => {
			(detectEventType as jest.Mock).mockReturnValue('smsStatus');

			mockWebhookFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'validateSignature') return true;
				if (paramName === 'events') return ['incomingSms', 'smsStatus', 'callStatus'];
				return undefined;
			});

			const bodyData = {
				MessageUUID: 'msg-123',
				Status: 'delivered',
			};
			mockWebhookFunctions.getBodyData.mockReturnValue(bodyData);

			const result = await plivoTrigger.webhook!.call(mockWebhookFunctions);

			expect(result.workflowData).toBeDefined();
		});

		it('should ignore unknown event types', async () => {
			(detectEventType as jest.Mock).mockReturnValue('unknown');

			mockWebhookFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'validateSignature') return true;
				if (paramName === 'events') return ['incomingSms', 'smsStatus'];
				return undefined;
			});

			mockWebhookFunctions.getBodyData.mockReturnValue({
				SomeUnknownField: 'value',
			});

			const result = await plivoTrigger.webhook!.call(mockWebhookFunctions);

			expect(result).toEqual({});
		});
	});

	describe('webhook method - real-world payloads', () => {
		beforeEach(() => {
			(verifyPlivoSignature as jest.Mock).mockResolvedValue(true);
		});

		it('should handle complete Plivo incoming SMS payload', async () => {
			(detectEventType as jest.Mock).mockReturnValue('incomingSms');

			mockWebhookFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'validateSignature') return true;
				if (paramName === 'events') return ['incomingSms'];
				return undefined;
			});

			const bodyData = {
				From: '+14155551234',
				To: '+14155555678',
				Text: 'Test message content',
				Type: 'sms',
				MessageUUID: 'e8e1c9c0-5d5a-11e9-8647-d663bd873d93',
				TotalAmount: '0.0035',
				Units: '1',
				TotalRate: '0.0035',
				MCC: '310',
				MNC: '004',
				PowerpackUUID: '',
			};
			mockWebhookFunctions.getBodyData.mockReturnValue(bodyData);

			const result = await plivoTrigger.webhook!.call(mockWebhookFunctions);

			expect(result.workflowData).toBeDefined();
			expect(mockWebhookFunctions.helpers.returnJsonArray).toHaveBeenCalledWith({
				...bodyData,
				_eventType: 'incomingSms',
			});
		});

		it('should handle complete Plivo SMS delivery status payload', async () => {
			(detectEventType as jest.Mock).mockReturnValue('smsStatus');

			mockWebhookFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'validateSignature') return true;
				if (paramName === 'events') return ['smsStatus'];
				return undefined;
			});

			const bodyData = {
				From: '+14155551234',
				To: '+14155555678',
				Status: 'delivered',
				MessageUUID: 'e8e1c9c0-5d5a-11e9-8647-d663bd873d93',
				ParentMessageUUID: '',
				PartInfo: '1 of 1',
				TotalAmount: '0.0035',
				TotalRate: '0.0035',
				Units: '1',
				MCC: '310',
				MNC: '004',
				ErrorCode: '',
			};
			mockWebhookFunctions.getBodyData.mockReturnValue(bodyData);

			const result = await plivoTrigger.webhook!.call(mockWebhookFunctions);

			expect(result.workflowData).toBeDefined();
		});

		it('should handle complete Plivo incoming call payload', async () => {
			(detectEventType as jest.Mock).mockReturnValue('incomingCall');

			mockWebhookFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'validateSignature') return true;
				if (paramName === 'events') return ['incomingCall'];
				return undefined;
			});

			const bodyData = {
				CallUUID: 'e8e1c9c0-5d5a-11e9-8647-d663bd873d93',
				From: '+14155551234',
				To: '+14155555678',
				CallStatus: 'ringing',
				Direction: 'inbound',
				ALegUUID: 'e8e1c9c0-5d5a-11e9-8647-d663bd873d93',
				ALegRequestUUID: 'e8e1c9c0-5d5a-11e9-8647-d663bd873d93',
			};
			mockWebhookFunctions.getBodyData.mockReturnValue(bodyData);

			const result = await plivoTrigger.webhook!.call(mockWebhookFunctions);

			expect(result.workflowData).toBeDefined();
		});

		it('should handle complete Plivo call status update payload', async () => {
			(detectEventType as jest.Mock).mockReturnValue('callStatus');

			mockWebhookFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'validateSignature') return true;
				if (paramName === 'events') return ['callStatus'];
				return undefined;
			});

			const bodyData = {
				CallUUID: 'e8e1c9c0-5d5a-11e9-8647-d663bd873d93',
				From: '+14155551234',
				To: '+14155555678',
				CallStatus: 'completed',
				Direction: 'outbound',
				Duration: '45',
				BillDuration: '60',
				BillRate: '0.0100',
				TotalCost: '0.0100',
				HangupCause: 'NORMAL_CLEARING',
				HangupSource: 'callee',
				EndTime: '2024-01-15 10:30:00',
				StartTime: '2024-01-15 10:29:15',
			};
			mockWebhookFunctions.getBodyData.mockReturnValue(bodyData);

			const result = await plivoTrigger.webhook!.call(mockWebhookFunctions);

			expect(result.workflowData).toBeDefined();
		});
	});
});

describe('PlivoTriggerHelpers - detectEventType', () => {
	// These tests verify the actual detectEventType function logic
	// We need to reimport without mocks for unit testing the helper
	const { detectEventType: realDetectEventType } = jest.requireActual('./PlivoTriggerHelpers');

	it('should detect incoming SMS', () => {
		const payload = {
			MessageUUID: 'msg-uuid-123',
			From: '+14155551234',
			To: '+14155555678',
			Text: 'Hello, this is a test message',
			Type: 'sms',
		};
		expect(realDetectEventType(payload)).toBe('incomingSms');
	});

	it('should detect SMS delivery status', () => {
		const payload = {
			MessageUUID: 'msg-uuid-123',
			Status: 'delivered',
			From: '+14155551234',
			To: '+14155555678',
		};
		expect(realDetectEventType(payload)).toBe('smsStatus');
	});

	it('should detect incoming call', () => {
		const payload = {
			CallUUID: 'call-uuid-123',
			Direction: 'inbound',
			CallStatus: 'ringing',
			From: '+14155551234',
			To: '+14155555678',
		};
		expect(realDetectEventType(payload)).toBe('incomingCall');
	});

	it('should detect call status update for outbound completed call', () => {
		const payload = {
			CallUUID: 'call-uuid-123',
			Direction: 'outbound',
			CallStatus: 'completed',
			Duration: 120,
		};
		expect(realDetectEventType(payload)).toBe('callStatus');
	});

	it('should detect call status for answered inbound call', () => {
		const payload = {
			CallUUID: 'call-uuid-123',
			Direction: 'inbound',
			CallStatus: 'answered',
		};
		expect(realDetectEventType(payload)).toBe('callStatus');
	});

	it('should return unknown for unrecognized payload', () => {
		const payload = {
			SomeOtherField: 'value',
		};
		expect(realDetectEventType(payload)).toBe('unknown');
	});

	it('should return unknown for empty payload', () => {
		expect(realDetectEventType({})).toBe('unknown');
	});

	it('should handle MessageUUID without Text or Status', () => {
		const payload = {
			MessageUUID: 'msg-uuid-123',
			From: '+14155551234',
		};
		expect(realDetectEventType(payload)).toBe('unknown');
	});

	it('should handle CallUUID without CallStatus', () => {
		const payload = {
			CallUUID: 'call-uuid-123',
			Direction: 'inbound',
		};
		expect(realDetectEventType(payload)).toBe('unknown');
	});

	it('should prioritize Status over Text when both present (SMS status)', () => {
		const payload = {
			MessageUUID: 'msg-uuid-123',
			Status: 'delivered',
			Text: 'Some text',
		};
		expect(realDetectEventType(payload)).toBe('smsStatus');
	});
});

describe('PlivoTriggerHelpers - verifyPlivoSignature', () => {
	// Import actual implementation for signature verification tests
	const { verifyPlivoSignature: realVerifyPlivoSignature } =
		jest.requireActual('./PlivoTriggerHelpers');

	// Helper to compute expected signature
	function computeExpectedSignature(
		authToken: string,
		webhookUrl: string,
		nonce: string,
		body?: string,
	): string {
		let baseString = webhookUrl + nonce;
		if (body) {
			baseString += body;
		}
		const hmac = createHmac('sha256', authToken);
		hmac.update(baseString);
		return hmac.digest('base64');
	}

	function createMockWebhookFunctions(options: {
		authToken?: string;
		signature?: string;
		nonce?: string;
		webhookUrl?: string;
		method?: string;
		rawBody?: string | Buffer;
	}) {
		const {
			authToken = 'test-auth-token',
			signature,
			nonce,
			webhookUrl = 'https://example.com/webhook/plivo',
			method = 'POST',
			rawBody,
		} = options;

		return {
			getCredentials: jest.fn().mockResolvedValue({
				authId: 'test-auth-id',
				authToken,
			}),
			getRequestObject: jest.fn().mockReturnValue({
				headers: {
					'x-plivo-signature-v3': signature,
					'x-plivo-signature-v3-nonce': nonce,
				},
				method,
				rawBody,
			}),
			getNodeWebhookUrl: jest.fn().mockReturnValue(webhookUrl),
		};
	}

	it('should return true when no auth token is configured', async () => {
		const mockFunctions = createMockWebhookFunctions({
			authToken: '',
		});

		const result = await realVerifyPlivoSignature.call(mockFunctions);
		expect(result).toBe(true);
	});

	it('should return false when signature header is missing', async () => {
		const mockFunctions = createMockWebhookFunctions({
			authToken: 'test-token',
			nonce: '12345678',
			// signature is undefined
		});

		const result = await realVerifyPlivoSignature.call(mockFunctions);
		expect(result).toBe(false);
	});

	it('should return false when nonce header is missing', async () => {
		const mockFunctions = createMockWebhookFunctions({
			authToken: 'test-token',
			signature: 'some-signature',
			// nonce is undefined
		});

		const result = await realVerifyPlivoSignature.call(mockFunctions);
		expect(result).toBe(false);
	});

	it('should validate correct signature for GET request', async () => {
		const authToken = 'test-auth-token-12345';
		const webhookUrl = 'https://example.com/webhook/plivo';
		const nonce = '12345678';
		const expectedSignature = computeExpectedSignature(authToken, webhookUrl, nonce);

		const mockFunctions = createMockWebhookFunctions({
			authToken,
			webhookUrl,
			nonce,
			signature: expectedSignature,
			method: 'GET',
		});

		const result = await realVerifyPlivoSignature.call(mockFunctions);
		expect(result).toBe(true);
	});

	it('should validate correct signature for POST request with string body', async () => {
		const authToken = 'test-auth-token-12345';
		const webhookUrl = 'https://example.com/webhook/plivo';
		const nonce = '12345678';
		const body = 'From=%2B14155551234&To=%2B14155555678&Text=Hello';
		const expectedSignature = computeExpectedSignature(authToken, webhookUrl, nonce, body);

		const mockFunctions = createMockWebhookFunctions({
			authToken,
			webhookUrl,
			nonce,
			signature: expectedSignature,
			method: 'POST',
			rawBody: body,
		});

		const result = await realVerifyPlivoSignature.call(mockFunctions);
		expect(result).toBe(true);
	});

	it('should validate correct signature for POST request with Buffer body', async () => {
		const authToken = 'test-auth-token-12345';
		const webhookUrl = 'https://example.com/webhook/plivo';
		const nonce = '12345678';
		const body = 'From=%2B14155551234&To=%2B14155555678&Text=Hello';
		const expectedSignature = computeExpectedSignature(authToken, webhookUrl, nonce, body);

		const mockFunctions = createMockWebhookFunctions({
			authToken,
			webhookUrl,
			nonce,
			signature: expectedSignature,
			method: 'POST',
			rawBody: Buffer.from(body),
		});

		const result = await realVerifyPlivoSignature.call(mockFunctions);
		expect(result).toBe(true);
	});

	it('should reject incorrect signature', async () => {
		const authToken = 'test-auth-token-12345';
		const webhookUrl = 'https://example.com/webhook/plivo';
		const nonce = '12345678';

		const mockFunctions = createMockWebhookFunctions({
			authToken,
			webhookUrl,
			nonce,
			signature: 'invalid-signature-that-wont-match',
			method: 'GET',
		});

		const result = await realVerifyPlivoSignature.call(mockFunctions);
		expect(result).toBe(false);
	});

	it('should reject signature with wrong auth token', async () => {
		const authToken = 'correct-auth-token';
		const wrongToken = 'wrong-auth-token';
		const webhookUrl = 'https://example.com/webhook/plivo';
		const nonce = '12345678';
		// Compute signature with wrong token
		const wrongSignature = computeExpectedSignature(wrongToken, webhookUrl, nonce);

		const mockFunctions = createMockWebhookFunctions({
			authToken, // Server has correct token
			webhookUrl,
			nonce,
			signature: wrongSignature, // But signature was made with wrong token
			method: 'GET',
		});

		const result = await realVerifyPlivoSignature.call(mockFunctions);
		expect(result).toBe(false);
	});

	it('should reject signature with tampered body', async () => {
		const authToken = 'test-auth-token-12345';
		const webhookUrl = 'https://example.com/webhook/plivo';
		const nonce = '12345678';
		const originalBody = 'From=%2B14155551234&Text=Original';
		const tamperedBody = 'From=%2B14155551234&Text=Tampered';
		// Signature computed with original body
		const signature = computeExpectedSignature(authToken, webhookUrl, nonce, originalBody);

		const mockFunctions = createMockWebhookFunctions({
			authToken,
			webhookUrl,
			nonce,
			signature,
			method: 'POST',
			rawBody: tamperedBody, // But request has tampered body
		});

		const result = await realVerifyPlivoSignature.call(mockFunctions);
		expect(result).toBe(false);
	});

	it('should produce different signatures for different URLs', () => {
		const authToken = 'test-token';
		const nonce = '12345678';
		const sig1 = computeExpectedSignature(authToken, 'https://example.com/webhook1', nonce);
		const sig2 = computeExpectedSignature(authToken, 'https://example.com/webhook2', nonce);
		expect(sig1).not.toBe(sig2);
	});

	it('should produce different signatures for different nonces', () => {
		const authToken = 'test-token';
		const webhookUrl = 'https://example.com/webhook';
		const sig1 = computeExpectedSignature(authToken, webhookUrl, 'nonce1');
		const sig2 = computeExpectedSignature(authToken, webhookUrl, 'nonce2');
		expect(sig1).not.toBe(sig2);
	});

	it('should produce base64 encoded signatures', () => {
		const authToken = 'test-token';
		const webhookUrl = 'https://example.com/webhook';
		const nonce = '12345678';
		const signature = computeExpectedSignature(authToken, webhookUrl, nonce);
		// Verify it's valid base64 by decoding and re-encoding
		expect(Buffer.from(signature, 'base64').toString('base64')).toBe(signature);
	});
});
