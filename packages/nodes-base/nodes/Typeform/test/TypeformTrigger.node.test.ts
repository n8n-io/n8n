import { randomBytes } from 'crypto';
import type { IHookFunctions, IWebhookFunctions } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { apiRequest } from '../GenericFunctions';
import { TypeformTrigger } from '../TypeformTrigger.node';
import { verifySignature } from '../TypeformTriggerHelpers';

jest.mock('../GenericFunctions');
jest.mock('../TypeformTriggerHelpers');
jest.mock('crypto', () => ({
	...jest.requireActual('crypto'),
	randomBytes: jest.fn(),
}));

describe('TypeformTrigger', () => {
	let trigger: TypeformTrigger;
	let mockHookFunctions: Pick<
		jest.Mocked<IHookFunctions>,
		'getNodeWebhookUrl' | 'getNodeParameter' | 'getWorkflowStaticData' | 'helpers'
	>;
	let mockWebhookFunctions: Pick<
		jest.Mocked<IWebhookFunctions>,
		| 'getNode'
		| 'getNodeParameter'
		| 'getBodyData'
		| 'getRequestObject'
		| 'getResponseObject'
		| 'getWorkflowStaticData'
		| 'helpers'
	>;

	beforeEach(() => {
		jest.clearAllMocks();
		trigger = new TypeformTrigger();

		mockHookFunctions = {
			getNodeWebhookUrl: jest.fn(),
			getNodeParameter: jest.fn(),
			getWorkflowStaticData: jest.fn(),
			helpers: {
				requestWithAuthentication: jest.fn(),
				requestOAuth2: jest.fn(),
			} as any,
		};

		mockWebhookFunctions = {
			getNode: jest.fn().mockReturnValue({ typeVersion: 1.1 }),
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

	describe('webhookMethods.default.checkExists', () => {
		it('should return true when webhook exists', async () => {
			const webhookUrl = 'https://example.com/webhook';
			const formId = 'form-123';
			const webhookId = 'webhook-123';

			mockHookFunctions.getNodeWebhookUrl.mockReturnValue(webhookUrl);
			mockHookFunctions.getNodeParameter.mockReturnValue(formId);
			mockHookFunctions.getWorkflowStaticData.mockReturnValue({});

			(apiRequest as jest.Mock).mockResolvedValue({
				items: [
					{
						form_id: formId,
						url: webhookUrl,
						tag: webhookId,
					},
				],
			});

			const result = await trigger.webhookMethods!.default.checkExists.call(
				mockHookFunctions as unknown as IHookFunctions,
			);

			expect(result).toBe(true);
			expect(apiRequest).toHaveBeenCalledWith('GET', `forms/${formId}/webhooks`, {});
			expect(mockHookFunctions.getWorkflowStaticData).toHaveBeenCalledWith('node');
		});

		it('should return false when webhook does not exist', async () => {
			const webhookUrl = 'https://example.com/webhook';
			const formId = 'form-123';

			mockHookFunctions.getNodeWebhookUrl.mockReturnValue(webhookUrl);
			mockHookFunctions.getNodeParameter.mockReturnValue(formId);
			mockHookFunctions.getWorkflowStaticData.mockReturnValue({});

			(apiRequest as jest.Mock).mockResolvedValue({
				items: [
					{
						form_id: formId,
						url: 'https://different-url.com/webhook',
						tag: 'webhook-123',
					},
				],
			});

			const result = await trigger.webhookMethods!.default.checkExists.call(
				mockHookFunctions as unknown as IHookFunctions,
			);

			expect(result).toBe(false);
		});

		it('should return false when no webhooks exist', async () => {
			const webhookUrl = 'https://example.com/webhook';
			const formId = 'form-123';

			mockHookFunctions.getNodeWebhookUrl.mockReturnValue(webhookUrl);
			mockHookFunctions.getNodeParameter.mockReturnValue(formId);
			mockHookFunctions.getWorkflowStaticData.mockReturnValue({});

			(apiRequest as jest.Mock).mockResolvedValue({
				items: [],
			});

			const result = await trigger.webhookMethods!.default.checkExists.call(
				mockHookFunctions as unknown as IHookFunctions,
			);

			expect(result).toBe(false);
		});
	});

	describe('webhookMethods.default.create', () => {
		it('should create webhook with secret', async () => {
			const webhookUrl = 'https://example.com/webhook';
			const formId = 'form-123';
			const webhookSecret = 'a'.repeat(64); // 32 bytes = 64 hex chars

			mockHookFunctions.getNodeWebhookUrl.mockReturnValue(webhookUrl);
			mockHookFunctions.getNodeParameter.mockReturnValue(formId);
			mockHookFunctions.getWorkflowStaticData.mockReturnValue({});

			(randomBytes as jest.Mock).mockReturnValue({
				toString: jest.fn().mockReturnValue(webhookSecret),
			});
			(apiRequest as jest.Mock).mockResolvedValue({});

			const result = await trigger.webhookMethods!.default.create.call(
				mockHookFunctions as unknown as IHookFunctions,
			);

			expect(result).toBe(true);
			expect(randomBytes).toHaveBeenCalledWith(32);
			expect(apiRequest).toHaveBeenCalledWith(
				'PUT',
				expect.stringContaining(`forms/${formId}/webhooks/n8n-`),
				{
					url: webhookUrl,
					enabled: true,
					verify_ssl: true,
					secret: webhookSecret,
				},
			);

			const webhookData = mockHookFunctions.getWorkflowStaticData!('node');
			expect(webhookData.webhookId).toBeDefined();
			expect(webhookData.webhookSecret).toBe(webhookSecret);
		});

		it('should save webhook secret in static data', async () => {
			const webhookUrl = 'https://example.com/webhook';
			const formId = 'form-123';
			const webhookSecret = 'test-secret-123';

			mockHookFunctions.getNodeWebhookUrl.mockReturnValue(webhookUrl);
			mockHookFunctions.getNodeParameter.mockReturnValue(formId);

			const webhookData: any = {};
			mockHookFunctions.getWorkflowStaticData.mockReturnValue(webhookData);

			(randomBytes as jest.Mock).mockReturnValue({
				toString: jest.fn().mockReturnValue(webhookSecret),
			});
			(apiRequest as jest.Mock).mockResolvedValue({});

			await trigger.webhookMethods!.default.create.call(
				mockHookFunctions as unknown as IHookFunctions,
			);

			expect(webhookData.webhookSecret).toBe(webhookSecret);
			expect(webhookData.webhookId).toBeDefined();
		});
	});

	describe('webhookMethods.default.delete', () => {
		it('should delete webhook and clean up secret', async () => {
			const formId = 'form-123';
			const webhookId = 'webhook-123';

			mockHookFunctions.getNodeParameter.mockReturnValue(formId);

			const webhookData: any = {
				webhookId,
				webhookSecret: 'test-secret',
			};
			mockHookFunctions.getWorkflowStaticData.mockReturnValue(webhookData);

			(apiRequest as jest.Mock).mockResolvedValue({});

			const result = await trigger.webhookMethods!.default.delete.call(
				mockHookFunctions as unknown as IHookFunctions,
			);

			expect(result).toBe(true);
			expect(apiRequest).toHaveBeenCalledWith(
				'DELETE',
				`forms/${formId}/webhooks/${webhookId}`,
				{},
			);
			expect(webhookData.webhookId).toBeUndefined();
			expect(webhookData.webhookSecret).toBeUndefined();
		});

		it('should return true when webhookId is not set', async () => {
			mockHookFunctions.getNodeParameter.mockReturnValue('form-123');
			mockHookFunctions.getWorkflowStaticData.mockReturnValue({});

			const result = await trigger.webhookMethods!.default.delete.call(
				mockHookFunctions as unknown as IHookFunctions,
			);

			expect(result).toBe(true);
			expect(apiRequest).not.toHaveBeenCalled();
		});

		it('should return false when deletion fails', async () => {
			const formId = 'form-123';
			const webhookId = 'webhook-123';

			mockHookFunctions.getNodeParameter.mockReturnValue(formId);

			const webhookData: any = {
				webhookId,
			};
			mockHookFunctions.getWorkflowStaticData.mockReturnValue(webhookData);

			(apiRequest as jest.Mock).mockRejectedValue(new Error('Delete failed'));

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
			const bodyData = {
				form_response: {
					definition: {
						fields: [
							{
								id: 'field1',
								title: 'Question 1',
							},
						],
					},
					answers: [
						{
							field: { id: 'field1' },
							type: 'text',
							text: 'Answer 1',
						},
					],
				},
			};

			(verifySignature as jest.Mock).mockReturnValue(true);
			mockWebhookFunctions.getNodeParameter.mockImplementation((name) => {
				if (name === 'simplifyAnswers') return true;
				if (name === 'onlyAnswers') return true;
				return null;
			});
			mockWebhookFunctions.getBodyData!.mockReturnValue(bodyData as any);

			const result = await trigger.webhook.call(
				mockWebhookFunctions as unknown as IWebhookFunctions,
			);

			expect(verifySignature).toHaveBeenCalled();
			expect(result).toBeDefined();
			expect(result.workflowData).toBeDefined();
		});

		it('should throw error when form_response is missing', async () => {
			const bodyData = {};

			(verifySignature as jest.Mock).mockReturnValue(true);
			mockWebhookFunctions.getBodyData.mockReturnValue(bodyData as any);

			await expect(
				trigger.webhook.call(mockWebhookFunctions as unknown as IWebhookFunctions),
			).rejects.toThrow(NodeApiError);
		});

		it('should throw error when definition is missing', async () => {
			const bodyData = {
				form_response: {
					answers: [],
				},
			};

			(verifySignature as jest.Mock).mockReturnValue(true);
			mockWebhookFunctions.getBodyData.mockReturnValue(bodyData as any);

			await expect(
				trigger.webhook.call(mockWebhookFunctions as unknown as IWebhookFunctions),
			).rejects.toThrow(NodeApiError);
		});

		it('should throw error when answers is missing', async () => {
			const bodyData = {
				form_response: {
					definition: {
						fields: [],
					},
				},
			};

			(verifySignature as jest.Mock).mockReturnValue(true);
			mockWebhookFunctions.getBodyData.mockReturnValue(bodyData as any);

			await expect(
				trigger.webhook.call(mockWebhookFunctions as unknown as IWebhookFunctions),
			).rejects.toThrow(NodeApiError);
		});
	});
});
