import { createHmac } from 'crypto';

import type { Request } from 'express';
import { mock, mockDeep } from 'jest-mock-extended';
import type { INode, IWebhookFunctions } from 'n8n-workflow';

import { LineMessagingApiTrigger } from '../LineMessagingApiTrigger.node';

describe('LineMessagingApiTrigger node', () => {
	const mockWebhookFunctions = mockDeep<IWebhookFunctions>();
	const trigger = new LineMessagingApiTrigger();

	const CHANNEL_SECRET = 'test-channel-secret';

	function makeRawBody(events: object[]): Buffer {
		return Buffer.from(JSON.stringify({ events }));
	}

	function validSignature(rawBody: Buffer, secret: string): string {
		return createHmac('SHA256', secret).update(rawBody).digest('base64');
	}

	beforeEach(() => {
		jest.resetAllMocks();
		mockWebhookFunctions.getNode.mockReturnValue(mock<INode>());
	});

	describe('signature validation', () => {
		it('should return 401 when x-line-signature header is missing', async () => {
			const statusMock = jest.fn().mockReturnValue({ send: jest.fn() });
			mockWebhookFunctions.getResponseObject.mockReturnValue({ status: statusMock } as any);
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				environment: 'production',
				channelSecret: CHANNEL_SECRET,
			});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				headers: {},
			} as Request);

			const result = await trigger.webhook.call(mockWebhookFunctions);

			expect(statusMock).toHaveBeenCalledWith(401);
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('should return 401 when x-line-signature is invalid', async () => {
			const rawBody = makeRawBody([{ type: 'message' }]);
			const statusMock = jest.fn().mockReturnValue({ send: jest.fn() });
			mockWebhookFunctions.getResponseObject.mockReturnValue({ status: statusMock } as any);
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				environment: 'production',
				channelSecret: CHANNEL_SECRET,
			});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				headers: { 'x-line-signature': 'invalid-signature' },
				rawBody,
			} as unknown as Request);

			const result = await trigger.webhook.call(mockWebhookFunctions);

			expect(statusMock).toHaveBeenCalledWith(401);
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('should process the request when signature is valid', async () => {
			const events = [{ type: 'message', id: 'ev1' }];
			const rawBody = makeRawBody(events);
			const signature = validSignature(rawBody, CHANNEL_SECRET);

			mockWebhookFunctions.getCredentials.mockResolvedValue({
				environment: 'production',
				channelSecret: CHANNEL_SECRET,
			});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				headers: { 'x-line-signature': signature },
				rawBody,
			} as unknown as Request);
			mockWebhookFunctions.getBodyData.mockReturnValue({ events });
			mockWebhookFunctions.getNodeParameter.mockReturnValue(['message']);

			const result = await trigger.webhook.call(mockWebhookFunctions);

			expect(result?.workflowData).toBeDefined();
			expect(result?.workflowData?.[0]).toHaveLength(1);
		});

		it('should skip signature validation when channelSecret is empty', async () => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				environment: 'production',
				channelSecret: '',
			});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				headers: {},
			} as Request);
			const events = [{ type: 'message', id: 'ev1' }];
			mockWebhookFunctions.getBodyData.mockReturnValue({ events });
			mockWebhookFunctions.getNodeParameter.mockReturnValue(['message']);

			const result = await trigger.webhook.call(mockWebhookFunctions);

			expect(result?.workflowData?.[0]).toHaveLength(1);
		});

		it('should use testChannelSecret when environment is test', async () => {
			const testSecret = 'test-env-secret';
			const events = [{ type: 'follow' }];
			const rawBody = makeRawBody(events);
			const signature = validSignature(rawBody, testSecret);

			mockWebhookFunctions.getCredentials.mockResolvedValue({
				environment: 'test',
				testChannelSecret: testSecret,
			});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				headers: { 'x-line-signature': signature },
				rawBody,
			} as unknown as Request);
			mockWebhookFunctions.getBodyData.mockReturnValue({ events });
			mockWebhookFunctions.getNodeParameter.mockReturnValue(['follow']);

			const result = await trigger.webhook.call(mockWebhookFunctions);

			expect(result?.workflowData?.[0]).toHaveLength(1);
		});
	});

	describe('event filtering', () => {
		beforeEach(() => {
			mockWebhookFunctions.getCredentials.mockResolvedValue({
				environment: 'production',
				channelSecret: '',
			});
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				headers: {},
			} as Request);
		});

		it('should return only events matching the selected event types', async () => {
			const events = [
				{ type: 'message', id: 'ev1' },
				{ type: 'follow', id: 'ev2' },
				{ type: 'unfollow', id: 'ev3' },
			];
			mockWebhookFunctions.getBodyData.mockReturnValue({ events });
			mockWebhookFunctions.getNodeParameter.mockReturnValue(['message']);

			const result = await trigger.webhook.call(mockWebhookFunctions);

			expect(result?.workflowData?.[0]).toHaveLength(1);
			expect(result?.workflowData?.[0]?.[0].json.type).toBe('message');
		});

		it('should return multiple events when multiple types are selected', async () => {
			const events = [
				{ type: 'message', id: 'ev1' },
				{ type: 'follow', id: 'ev2' },
				{ type: 'unfollow', id: 'ev3' },
			];
			mockWebhookFunctions.getBodyData.mockReturnValue({ events });
			mockWebhookFunctions.getNodeParameter.mockReturnValue(['message', 'follow']);

			const result = await trigger.webhook.call(mockWebhookFunctions);

			expect(result?.workflowData?.[0]).toHaveLength(2);
		});

		it('should return noWebhookResponse when no events match selected types', async () => {
			const statusMock = jest.fn().mockReturnValue({ send: jest.fn() });
			mockWebhookFunctions.getResponseObject.mockReturnValue({ status: statusMock } as any);
			const events = [{ type: 'follow', id: 'ev1' }];
			mockWebhookFunctions.getBodyData.mockReturnValue({ events });
			mockWebhookFunctions.getNodeParameter.mockReturnValue(['message']);

			const result = await trigger.webhook.call(mockWebhookFunctions);

			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('should return noWebhookResponse with 200 OK when events array is empty', async () => {
			const statusMock = jest.fn().mockReturnValue({ send: jest.fn() });
			mockWebhookFunctions.getResponseObject.mockReturnValue({ status: statusMock } as any);
			mockWebhookFunctions.getBodyData.mockReturnValue({ events: [] });

			const result = await trigger.webhook.call(mockWebhookFunctions);

			expect(statusMock).toHaveBeenCalledWith(200);
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('should handle missing events field in body gracefully', async () => {
			const statusMock = jest.fn().mockReturnValue({ send: jest.fn() });
			mockWebhookFunctions.getResponseObject.mockReturnValue({ status: statusMock } as any);
			mockWebhookFunctions.getBodyData.mockReturnValue({});

			const result = await trigger.webhook.call(mockWebhookFunctions);

			expect(statusMock).toHaveBeenCalledWith(200);
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('should return each matching event as a separate workflow item', async () => {
			const events = [
				{ type: 'message', id: 'ev1', text: 'hi' },
				{ type: 'message', id: 'ev2', text: 'hello' },
			];
			mockWebhookFunctions.getBodyData.mockReturnValue({ events });
			mockWebhookFunctions.getNodeParameter.mockReturnValue(['message']);

			const result = await trigger.webhook.call(mockWebhookFunctions);

			expect(result?.workflowData?.[0]).toHaveLength(2);
			expect(result?.workflowData?.[0]?.[0].json.id).toBe('ev1');
			expect(result?.workflowData?.[0]?.[1].json.id).toBe('ev2');
		});
	});
});
