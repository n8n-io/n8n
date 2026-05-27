import { randomBytes } from 'crypto';
import type { IHookFunctions, IWebhookFunctions } from 'n8n-workflow';

import { mauticApiRequest } from '../GenericFunctions';
import { MauticTrigger } from '../MauticTrigger.node';
import { verifySignature } from '../MauticTriggerHelpers';

jest.mock('../GenericFunctions');
jest.mock('../MauticTriggerHelpers');
jest.mock('crypto', () => ({
	...jest.requireActual('crypto'),
	randomBytes: jest.fn(),
}));

describe('MauticTrigger', () => {
	let trigger: MauticTrigger;
	let mockHookFunctions: Pick<
		jest.Mocked<IHookFunctions>,
		'getNodeWebhookUrl' | 'getNodeParameter' | 'getWorkflowStaticData'
	>;
	let mockWebhookFunctions: Pick<
		jest.Mocked<IWebhookFunctions>,
		'getRequestObject' | 'getResponseObject' | 'getWorkflowStaticData' | 'helpers'
	>;

	beforeEach(() => {
		jest.clearAllMocks();
		trigger = new MauticTrigger();

		mockHookFunctions = {
			getNodeWebhookUrl: jest.fn(),
			getNodeParameter: jest.fn(),
			getWorkflowStaticData: jest.fn(),
		};

		mockWebhookFunctions = {
			getRequestObject: jest.fn(),
			getResponseObject: jest.fn(),
			getWorkflowStaticData: jest.fn(),
			helpers: {
				returnJsonArray: jest.fn((data) => data),
			} as any,
		};
	});

	describe('webhookMethods.default.create', () => {
		it('should create webhook with secret', async () => {
			const webhookUrl = 'https://example.com/webhook/path';
			const webhookSecret = 'a'.repeat(64);

			mockHookFunctions.getNodeWebhookUrl.mockReturnValue(webhookUrl);
			mockHookFunctions.getNodeParameter.mockImplementation((name: string) => {
				if (name === 'events') return ['mautic.lead_post_save_new'];
				if (name === 'eventsOrder') return 'ASC';
				return null;
			});
			mockHookFunctions.getWorkflowStaticData.mockReturnValue({});

			(randomBytes as jest.Mock).mockReturnValue({
				toString: jest.fn().mockReturnValue(webhookSecret),
			});
			(mauticApiRequest as jest.Mock).mockResolvedValue({ hook: { id: 'hook-123' } });

			const result = await trigger.webhookMethods!.default.create.call(
				mockHookFunctions as unknown as IHookFunctions,
			);

			expect(result).toBe(true);
			expect(randomBytes).toHaveBeenCalledWith(32);
			expect(mauticApiRequest).toHaveBeenCalledWith(
				'POST',
				'/hooks/new',
				expect.objectContaining({
					secret: webhookSecret,
					webhookUrl,
				}),
			);

			const webhookData = mockHookFunctions.getWorkflowStaticData('node');
			expect(webhookData.webhookId).toBe('hook-123');
			expect(webhookData.webhookSecret).toBe(webhookSecret);
		});
	});

	describe('webhookMethods.default.delete', () => {
		it('should delete webhook and clean up secret', async () => {
			const webhookData: any = {
				webhookId: 'hook-123',
				webhookSecret: 'test-secret',
			};
			mockHookFunctions.getWorkflowStaticData.mockReturnValue(webhookData);
			(mauticApiRequest as jest.Mock).mockResolvedValue({});

			const result = await trigger.webhookMethods!.default.delete.call(
				mockHookFunctions as unknown as IHookFunctions,
			);

			expect(result).toBe(true);
			expect(mauticApiRequest).toHaveBeenCalledWith('DELETE', '/hooks/hook-123/delete');
			expect(webhookData.webhookId).toBeUndefined();
			expect(webhookData.webhookSecret).toBeUndefined();
		});
	});

	describe('webhook', () => {
		it('should return 401 when signature verification fails', async () => {
			const mockResponse = {
				status: jest.fn().mockReturnThis(),
				send: jest.fn().mockReturnThis(),
				end: jest.fn(),
			};

			(verifySignature as jest.Mock).mockReturnValue(false);
			mockWebhookFunctions.getResponseObject.mockReturnValue(mockResponse as any);

			const result = await trigger.webhook.call(
				mockWebhookFunctions as unknown as IWebhookFunctions,
			);

			expect(verifySignature).toHaveBeenCalled();
			expect(mockResponse.status).toHaveBeenCalledWith(401);
			expect(mockResponse.send).toHaveBeenCalledWith('Unauthorized');
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('should process webhook when signature verification passes', async () => {
			const bodyData = {
				'mautic.lead_post_save_new': [{ contact: { id: 1, name: 'Test' } }],
			};

			(verifySignature as jest.Mock).mockReturnValue(true);
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				body: bodyData,
			} as any);

			const result = await trigger.webhook.call(
				mockWebhookFunctions as unknown as IWebhookFunctions,
			);

			expect(verifySignature).toHaveBeenCalled();
			expect(result).toBeDefined();
			expect(result.workflowData).toBeDefined();
		});
	});
});
