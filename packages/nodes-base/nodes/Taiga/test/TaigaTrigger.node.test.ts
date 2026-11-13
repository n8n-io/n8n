import type { IDataObject, IHookFunctions, IRequestOptions, IWebhookFunctions } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { TaigaTrigger } from '../TaigaTrigger.node';
import { verifySignature } from '../TaigaTriggerHelpers';
import type { Mock, Mocked } from 'vitest';

vi.mock('../TaigaTriggerHelpers');

describe('TaigaTrigger', () => {
	let trigger: TaigaTrigger;
	let mockResponse: { status: Mock; send: Mock; end: Mock };
	let mockWebhookFunctions: Pick<
		Mocked<IWebhookFunctions>,
		| 'getNodeParameter'
		| 'getRequestObject'
		| 'getResponseObject'
		| 'getWorkflowStaticData'
		| 'helpers'
	>;

	beforeEach(() => {
		vi.clearAllMocks();
		trigger = new TaigaTrigger();

		mockResponse = {
			status: vi.fn().mockReturnThis(),
			send: vi.fn().mockReturnThis(),
			end: vi.fn(),
		};

		mockWebhookFunctions = {
			getNodeParameter: vi.fn(),
			getRequestObject: vi.fn(),
			getResponseObject: vi.fn().mockReturnValue(mockResponse),
			getWorkflowStaticData: vi.fn(),
			helpers: {
				returnJsonArray: vi.fn((data) => [{ json: data }]),
			} as any,
		};
	});

	describe('webhook', () => {
		it('should return 401 when signature verification fails', async () => {
			(verifySignature as Mock).mockReturnValue(false);

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
			const body = { action: 'create', type: 'issue', data: { id: 1 } };

			(verifySignature as Mock).mockReturnValue(true);
			mockWebhookFunctions.getRequestObject.mockReturnValue({ body } as any);
			mockWebhookFunctions.getNodeParameter.mockImplementation((name: string) => {
				if (name === 'operations') return ['all'];
				if (name === 'resources') return ['all'];
				return null;
			});

			const result = await trigger.webhook.call(
				mockWebhookFunctions as unknown as IWebhookFunctions,
			);

			expect(verifySignature).toHaveBeenCalled();
			expect(mockResponse.status).not.toHaveBeenCalled();
			expect(result.workflowData).toBeDefined();
			expect(mockWebhookFunctions.helpers.returnJsonArray).toHaveBeenCalledWith(body);
		});

		it('should process webhook when no key is stored (backward compatibility)', async () => {
			const body = { action: 'change', type: 'task', data: { id: 2 } };

			// helper returns true when key is missing — simulate by returning true
			(verifySignature as Mock).mockReturnValue(true);
			mockWebhookFunctions.getRequestObject.mockReturnValue({ body } as any);
			mockWebhookFunctions.getNodeParameter.mockImplementation((name: string) => {
				if (name === 'operations') return ['all'];
				if (name === 'resources') return ['all'];
				return null;
			});

			const result = await trigger.webhook.call(
				mockWebhookFunctions as unknown as IWebhookFunctions,
			);

			expect(result.workflowData).toBeDefined();
			expect(mockResponse.status).not.toHaveBeenCalled();
		});
	});

	describe('webhookMethods.delete', () => {
		it('should delete the webhook with the stored ID', async () => {
			const context = mockDeep<IHookFunctions>();
			const webhookData: IDataObject = { webhookId: 55, key: 'secret' };
			context.getWorkflowStaticData.mockReturnValue(webhookData);
			context.getCredentials.mockResolvedValue({
				username: 'nathan',
				password: 'fake-password',
				environment: 'selfHosted',
				url: 'https://taiga.example.com',
			});
			context.helpers.request.mockResolvedValue({ auth_token: 'fake-token' });

			const result = await trigger.webhookMethods.default.delete.call(context);

			expect(result).toBe(true);
			expect(webhookData).toEqual({});
			expect(
				context.helpers.request.mock.calls.map(([options]) => [
					(options as IRequestOptions).method,
					String((options as IRequestOptions).uri),
				]),
			).toEqual([
				['POST', 'https://taiga.example.com/api/v1/auth'],
				['DELETE', 'https://taiga.example.com/api/v1/webhooks/55'],
			]);
		});
	});
});
