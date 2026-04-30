import { randomBytes } from 'crypto';
import type { IHookFunctions, IWebhookFunctions } from 'n8n-workflow';

import { FormstackTrigger } from '../FormstackTrigger.node';
import { verifySignature } from '../FormstackTriggerHelpers';
import { apiRequest } from '../GenericFunctions';

jest.mock('../GenericFunctions');
jest.mock('../FormstackTriggerHelpers');
jest.mock('crypto', () => ({
	...jest.requireActual('crypto'),
	randomBytes: jest.fn(),
}));

describe('FormstackTrigger', () => {
	let trigger: FormstackTrigger;
	let mockHookFunctions: Pick<
		jest.Mocked<IHookFunctions>,
		'getNodeWebhookUrl' | 'getNodeParameter' | 'getWorkflowStaticData'
	>;
	let mockWebhookFunctions: Pick<
		jest.Mocked<IWebhookFunctions>,
		| 'getNodeParameter'
		| 'getBodyData'
		| 'getRequestObject'
		| 'getResponseObject'
		| 'getWorkflowStaticData'
		| 'helpers'
	>;

	beforeEach(() => {
		jest.clearAllMocks();
		trigger = new FormstackTrigger();

		mockHookFunctions = {
			getNodeWebhookUrl: jest.fn(),
			getNodeParameter: jest.fn(),
			getWorkflowStaticData: jest.fn(),
		};

		mockWebhookFunctions = {
			getNodeParameter: jest.fn(),
			getBodyData: jest.fn(),
			getRequestObject: jest.fn(),
			getResponseObject: jest.fn(),
			getWorkflowStaticData: jest.fn(),
			helpers: {
				returnJsonArray: jest.fn((data) => data),
			} as any,
		};
	});

	describe('webhookMethods.default.create', () => {
		it('should create webhook with hmac_secret and persist secret in static data', async () => {
			const webhookUrl = 'https://example.com/webhook';
			const formId = 'form-123';
			const webhookId = 'webhook-456';
			const webhookSecret = 'a'.repeat(64);

			mockHookFunctions.getNodeWebhookUrl.mockReturnValue(webhookUrl);
			mockHookFunctions.getNodeParameter.mockReturnValue(formId);

			const webhookData: any = {};
			mockHookFunctions.getWorkflowStaticData.mockReturnValue(webhookData);

			(randomBytes as jest.Mock).mockReturnValue({
				toString: jest.fn().mockReturnValue(webhookSecret),
			});
			(apiRequest as jest.Mock).mockResolvedValue({ id: webhookId });

			const result = await trigger.webhookMethods.default.create.call(
				mockHookFunctions as unknown as IHookFunctions,
			);

			expect(result).toBe(true);
			expect(randomBytes).toHaveBeenCalledWith(32);
			expect(apiRequest).toHaveBeenCalledWith('POST', `form/${formId}/webhook.json`, {
				url: webhookUrl,
				standardize_field_values: true,
				include_field_type: true,
				content_type: 'json',
				hmac_secret: webhookSecret,
			});
			expect(webhookData.webhookId).toBe(webhookId);
			expect(webhookData.webhookSecret).toBe(webhookSecret);
		});
	});

	describe('webhookMethods.default.delete', () => {
		it('should clean up webhookSecret from static data on delete', async () => {
			const webhookId = 'webhook-456';
			const webhookData: any = {
				webhookId,
				webhookSecret: 'stored-secret',
			};

			mockHookFunctions.getWorkflowStaticData.mockReturnValue(webhookData);
			(apiRequest as jest.Mock).mockResolvedValue({});

			const result = await trigger.webhookMethods.default.delete.call(
				mockHookFunctions as unknown as IHookFunctions,
			);

			expect(result).toBe(true);
			expect(apiRequest).toHaveBeenCalledWith('DELETE', `webhook/${webhookId}.json`, {});
			expect(webhookData.webhookId).toBeUndefined();
			expect(webhookData.webhookSecret).toBeUndefined();
		});

		it('should return true when no webhookId is set', async () => {
			mockHookFunctions.getWorkflowStaticData.mockReturnValue({});

			const result = await trigger.webhookMethods.default.delete.call(
				mockHookFunctions as unknown as IHookFunctions,
			);

			expect(result).toBe(true);
			expect(apiRequest).not.toHaveBeenCalled();
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
			expect(mockResponse.end).toHaveBeenCalled();
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('should process webhook when signature verification passes', async () => {
			const bodyData = {
				FormID: '123',
				UniqueID: 'abc',
				field1: { value: 'foo' },
			};

			(verifySignature as jest.Mock).mockReturnValue(true);
			mockWebhookFunctions.getNodeParameter.mockReturnValue(true);
			mockWebhookFunctions.getBodyData.mockReturnValue(bodyData as any);

			const result = await trigger.webhook.call(
				mockWebhookFunctions as unknown as IWebhookFunctions,
			);

			expect(verifySignature).toHaveBeenCalled();
			expect(result.workflowData).toBeDefined();
		});
	});
});
