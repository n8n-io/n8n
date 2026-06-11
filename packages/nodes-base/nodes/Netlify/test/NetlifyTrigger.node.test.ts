import { randomBytes } from 'crypto';
import type { IHookFunctions, IWebhookFunctions } from 'n8n-workflow';

import { netlifyApiRequest } from '../GenericFunctions';
import { NetlifyTrigger } from '../NetlifyTrigger.node';
import { verifySignature } from '../NetlifyTriggerHelpers';

jest.mock('../GenericFunctions');
jest.mock('../NetlifyTriggerHelpers');
jest.mock('crypto', () => ({
	...jest.requireActual('crypto'),
	randomBytes: jest.fn(),
}));

describe('NetlifyTrigger', () => {
	let trigger: NetlifyTrigger;
	let mockHookFunctions: Pick<
		jest.Mocked<IHookFunctions>,
		'getNodeWebhookUrl' | 'getNodeParameter' | 'getWorkflowStaticData'
	>;
	let mockWebhookFunctions: Pick<
		jest.Mocked<IWebhookFunctions>,
		| 'getNodeParameter'
		| 'getRequestObject'
		| 'getResponseObject'
		| 'getWorkflowStaticData'
		| 'helpers'
	>;

	beforeEach(() => {
		jest.clearAllMocks();
		trigger = new NetlifyTrigger();

		mockHookFunctions = {
			getNodeWebhookUrl: jest.fn(),
			getNodeParameter: jest.fn(),
			getWorkflowStaticData: jest.fn(),
		};

		mockWebhookFunctions = {
			getNodeParameter: jest.fn(),
			getRequestObject: jest.fn(),
			getResponseObject: jest.fn(),
			getWorkflowStaticData: jest.fn(),
			helpers: {
				returnJsonArray: jest.fn((data) => data),
			} as any,
		};
	});

	describe('webhookMethods.default.create', () => {
		it('should generate a signing secret and pass it to Netlify', async () => {
			const webhookUrl = 'https://example.com/webhook';
			const siteId = 'site-123';
			const webhookSecret = 'a'.repeat(64);
			const webhookId = 'hook-1';

			mockHookFunctions.getNodeWebhookUrl.mockReturnValue(webhookUrl);
			mockHookFunctions.getNodeParameter.mockImplementation((name) => {
				if (name === 'event') return 'deployCreated';
				if (name === 'siteId') return siteId;
				if (name === 'formId') return '*';
				return undefined;
			});

			const webhookData: any = {};
			mockHookFunctions.getWorkflowStaticData.mockReturnValue(webhookData);

			(randomBytes as jest.Mock).mockReturnValue({
				toString: jest.fn().mockReturnValue(webhookSecret),
			});
			(netlifyApiRequest as jest.Mock).mockResolvedValue({ id: webhookId });

			const result = await trigger.webhookMethods!.default.create.call(
				mockHookFunctions as unknown as IHookFunctions,
			);

			expect(result).toBe(true);
			expect(randomBytes).toHaveBeenCalledWith(32);
			expect(netlifyApiRequest).toHaveBeenCalledWith('POST', '/hooks', {
				event: 'deploy_created',
				data: {
					url: webhookUrl,
					signature_secret: webhookSecret,
				},
				site_id: siteId,
			});
			expect(webhookData.webhookId).toBe(webhookId);
			expect(webhookData.webhookSecret).toBe(webhookSecret);
		});

		it('should include form_id when event is submissionCreated and a form is selected', async () => {
			const webhookUrl = 'https://example.com/webhook';
			const siteId = 'site-123';
			const formId = 'form-1';
			const webhookSecret = 'b'.repeat(64);

			mockHookFunctions.getNodeWebhookUrl.mockReturnValue(webhookUrl);
			mockHookFunctions.getNodeParameter.mockImplementation((name) => {
				if (name === 'event') return 'submissionCreated';
				if (name === 'siteId') return siteId;
				if (name === 'formId') return formId;
				return undefined;
			});
			mockHookFunctions.getWorkflowStaticData.mockReturnValue({});

			(randomBytes as jest.Mock).mockReturnValue({
				toString: jest.fn().mockReturnValue(webhookSecret),
			});
			(netlifyApiRequest as jest.Mock).mockResolvedValue({ id: 'hook-2' });

			await trigger.webhookMethods!.default.create.call(
				mockHookFunctions as unknown as IHookFunctions,
			);

			expect(netlifyApiRequest).toHaveBeenCalledWith('POST', '/hooks', {
				event: 'submission_created',
				data: {
					url: webhookUrl,
					signature_secret: webhookSecret,
				},
				site_id: siteId,
				form_id: formId,
			});
		});
	});

	describe('webhookMethods.default.delete', () => {
		it('should remove the webhook and clear the stored secret', async () => {
			const webhookId = 'hook-1';
			const webhookData: any = {
				webhookId,
				webhookSecret: 'stored-secret',
			};

			mockHookFunctions.getWorkflowStaticData.mockReturnValue(webhookData);
			(netlifyApiRequest as jest.Mock).mockResolvedValue({});

			const result = await trigger.webhookMethods!.default.delete.call(
				mockHookFunctions as unknown as IHookFunctions,
			);

			expect(result).toBe(true);
			expect(netlifyApiRequest).toHaveBeenCalledWith('DELETE', `/hooks/${webhookId}`);
			expect(webhookData.webhookId).toBeUndefined();
			expect(webhookData.webhookSecret).toBeUndefined();
		});
	});

	describe('webhook', () => {
		it('should respond 401 when signature verification fails', async () => {
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

		it('should return workflow data when verification passes', async () => {
			const body = { id: 'deploy-1', state: 'ready' };

			(verifySignature as jest.Mock).mockReturnValue(true);
			mockWebhookFunctions.getNodeParameter.mockImplementation((name) => {
				if (name === 'simple') return false;
				if (name === 'event') return 'deployCreated';
				return undefined;
			});
			mockWebhookFunctions.getRequestObject.mockReturnValue({ body } as any);

			const result = await trigger.webhook.call(
				mockWebhookFunctions as unknown as IWebhookFunctions,
			);

			expect(verifySignature).toHaveBeenCalled();
			expect(result.workflowData).toBeDefined();
		});

		it('should return workflow data when no secret is configured (backward compat)', async () => {
			const body = { id: 'deploy-1', state: 'ready' };

			(verifySignature as jest.Mock).mockReturnValue(true);
			mockWebhookFunctions.getNodeParameter.mockImplementation((name) => {
				if (name === 'simple') return false;
				if (name === 'event') return 'deployCreated';
				return undefined;
			});
			mockWebhookFunctions.getRequestObject.mockReturnValue({ body } as any);
			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({});

			const result = await trigger.webhook.call(
				mockWebhookFunctions as unknown as IWebhookFunctions,
			);

			expect(result.workflowData).toBeDefined();
		});

		it('should unwrap data field for simplified submissionCreated payloads', async () => {
			const body = { data: { name: 'Alice', email: 'alice@example.com' } };

			(verifySignature as jest.Mock).mockReturnValue(true);
			mockWebhookFunctions.getNodeParameter.mockImplementation((name) => {
				if (name === 'simple') return true;
				if (name === 'event') return 'submissionCreated';
				return undefined;
			});
			mockWebhookFunctions.getRequestObject.mockReturnValue({ body } as any);

			await trigger.webhook.call(mockWebhookFunctions as unknown as IWebhookFunctions);

			expect(mockWebhookFunctions.helpers.returnJsonArray).toHaveBeenCalledWith(body.data);
		});
	});
});
