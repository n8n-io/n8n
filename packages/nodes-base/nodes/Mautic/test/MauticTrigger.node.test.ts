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
		'getRequestObject' | 'getResponseObject' | 'helpers'
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
			helpers: {
				returnJsonArray: jest.fn((data) => [{ json: data }]),
			} as any,
		};
	});

	describe('webhookMethods.default.create', () => {
		it('should create webhook with auto-generated secret', async () => {
			const webhookUrl = 'https://example.com/webhook/abc';
			const webhookSecret = 'a'.repeat(64);
			const webhookData: any = {};

			mockHookFunctions.getNodeWebhookUrl.mockReturnValue(webhookUrl);
			mockHookFunctions.getNodeParameter.mockImplementation((name) => {
				if (name === 'events') return ['mautic.lead_post_save_new'];
				if (name === 'eventsOrder') return 'ASC';
				return undefined;
			});
			mockHookFunctions.getWorkflowStaticData.mockReturnValue(webhookData);

			(randomBytes as jest.Mock).mockReturnValue({
				toString: jest.fn().mockReturnValue(webhookSecret),
			});
			(mauticApiRequest as jest.Mock).mockResolvedValue({ hook: { id: 42 } });

			const result = await trigger.webhookMethods!.default.create.call(
				mockHookFunctions as unknown as IHookFunctions,
			);

			expect(result).toBe(true);
			expect(randomBytes).toHaveBeenCalledWith(32);
			expect(mauticApiRequest).toHaveBeenCalledWith(
				'POST',
				'/hooks/new',
				expect.objectContaining({
					webhookUrl,
					secret: webhookSecret,
					triggers: ['mautic.lead_post_save_new'],
					eventsOrderbyDir: 'ASC',
					isPublished: true,
				}),
			);
			expect(webhookData.webhookId).toBe(42);
			expect(webhookData.webhookSecret).toBe(webhookSecret);
		});
	});

	describe('webhookMethods.default.delete', () => {
		it('should delete webhook and clean up secret', async () => {
			const webhookData: any = {
				webhookId: 42,
				webhookSecret: 'test-secret',
			};
			mockHookFunctions.getWorkflowStaticData.mockReturnValue(webhookData);

			(mauticApiRequest as jest.Mock).mockResolvedValue({});

			const result = await trigger.webhookMethods!.default.delete.call(
				mockHookFunctions as unknown as IHookFunctions,
			);

			expect(result).toBe(true);
			expect(mauticApiRequest).toHaveBeenCalledWith('DELETE', '/hooks/42/delete');
			expect(webhookData.webhookId).toBeUndefined();
			expect(webhookData.webhookSecret).toBeUndefined();
		});

		it('should return false when deletion fails', async () => {
			const webhookData: any = {
				webhookId: 42,
				webhookSecret: 'test-secret',
			};
			mockHookFunctions.getWorkflowStaticData.mockReturnValue(webhookData);

			(mauticApiRequest as jest.Mock).mockRejectedValue(new Error('Delete failed'));

			const result = await trigger.webhookMethods!.default.delete.call(
				mockHookFunctions as unknown as IHookFunctions,
			);

			expect(result).toBe(false);
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
			expect(result).toEqual({
				noWebhookResponse: true,
			});
		});

		it('should process webhook when signature verification passes', async () => {
			const bodyData = { 'mautic.lead_post_save_new': [{ id: 1 }] };

			(verifySignature as jest.Mock).mockReturnValue(true);
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				body: bodyData,
			} as any);

			const result = await trigger.webhook.call(
				mockWebhookFunctions as unknown as IWebhookFunctions,
			);

			expect(verifySignature).toHaveBeenCalled();
			expect(mockWebhookFunctions.helpers.returnJsonArray).toHaveBeenCalledWith(bodyData);
			expect(result).toEqual({
				workflowData: [[{ json: bodyData }]],
			});
		});
	});
});
