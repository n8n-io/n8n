import type { IDataObject, IHookFunctions, INode, IWebhookFunctions } from 'n8n-workflow';
import { mock, mockDeep, type DeepMockProxy } from 'vitest-mock-extended';

import { MailerLiteTriggerV2 } from '../../v2/MailerLiteTriggerV2.node';

vi.mock('../../v2/MailerLiteTriggerHelpers', () => ({
	verifySignature: vi.fn(),
}));

import { verifySignature } from '../../v2/MailerLiteTriggerHelpers';
import type { Mock } from 'vitest';

describe('MailerLiteTriggerV2', () => {
	let trigger: MailerLiteTriggerV2;
	let mockWebhookFunctions: Partial<IWebhookFunctions>;
	let mockResponse: { status: Mock; send: Mock; end: Mock };

	beforeEach(() => {
		vi.clearAllMocks();
		trigger = new MailerLiteTriggerV2({
			displayName: 'MailerLite Trigger',
			name: 'mailerLiteTrigger',
			icon: 'file:MailerLite.svg',
			group: ['trigger'],
			description: 'Starts the workflow when MailerLite events occur',
			defaultVersion: 2,
		});

		mockResponse = {
			status: vi.fn().mockReturnThis(),
			send: vi.fn().mockReturnThis(),
			end: vi.fn().mockReturnThis(),
		};

		mockWebhookFunctions = {
			getBodyData: vi.fn(),
			getResponseObject: vi.fn().mockReturnValue(mockResponse),
			helpers: {
				returnJsonArray: vi.fn((data) => data),
			} as unknown as IWebhookFunctions['helpers'],
		};

		(verifySignature as Mock).mockReturnValue(true);
	});

	describe('webhook', () => {
		it('should trigger workflow when signature is valid', async () => {
			const fields: IDataObject[] = [{ id: '1', name: 'subscriber.created' }];
			(mockWebhookFunctions.getBodyData as Mock).mockReturnValue({ fields });

			const result = await trigger.webhook.call(mockWebhookFunctions as IWebhookFunctions);

			expect(result.workflowData).toBeDefined();
			expect(mockWebhookFunctions.helpers!.returnJsonArray).toHaveBeenCalledWith(fields);
		});

		it('should return 401 when signature verification fails', async () => {
			(verifySignature as Mock).mockReturnValue(false);

			const result = await trigger.webhook.call(mockWebhookFunctions as IWebhookFunctions);

			expect(mockResponse.status).toHaveBeenCalledWith(401);
			expect(mockResponse.send).toHaveBeenCalledWith('Unauthorized');
			expect(mockResponse.end).toHaveBeenCalled();
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('should trigger workflow when no secret is configured (backward compatibility)', async () => {
			// verifySignature returns true when no secret is configured
			(verifySignature as Mock).mockReturnValue(true);
			const fields: IDataObject[] = [{ id: '1' }];
			(mockWebhookFunctions.getBodyData as Mock).mockReturnValue({ fields });

			const result = await trigger.webhook.call(mockWebhookFunctions as IWebhookFunctions);

			expect(result.workflowData).toBeDefined();
			expect(mockResponse.status).not.toHaveBeenCalled();
		});
	});

	describe('webhookMethods', () => {
		const webhookUrl = 'https://n8n.example.com/webhook/abc';
		const events = ['subscriber.created'];
		let hookFunctions: DeepMockProxy<IHookFunctions>;
		let staticData: IDataObject;

		const requestedUrls = () =>
			hookFunctions.helpers.httpRequestWithAuthentication.mock.calls.map(([, options]) =>
				String(options.url),
			);

		beforeEach(() => {
			staticData = {};
			hookFunctions = mockDeep<IHookFunctions>();
			hookFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 2 }));
			hookFunctions.getNodeWebhookUrl.mockReturnValue(webhookUrl);
			hookFunctions.getNodeParameter.mockReturnValue(events);
			hookFunctions.getWorkflowStaticData.mockReturnValue(staticData);
		});

		it('should list webhooks in checkExists', async () => {
			hookFunctions.helpers.httpRequestWithAuthentication.mockResolvedValue({
				data: [{ id: '42', url: webhookUrl, events }],
			});

			await trigger.webhookMethods.default.checkExists.call(hookFunctions);

			expect(requestedUrls()).toEqual(['https://connect.mailerlite.com/api/webhooks']);
		});

		it('should create a webhook in create', async () => {
			hookFunctions.helpers.httpRequestWithAuthentication.mockResolvedValue({
				data: { id: '42' },
			});

			await expect(trigger.webhookMethods.default.create.call(hookFunctions)).resolves.toBe(true);

			expect(requestedUrls()).toEqual(['https://connect.mailerlite.com/api/webhooks']);
			expect(staticData.webhookId).toBe('42');
		});

		it('should encode the webhook ID in delete', async () => {
			staticData.webhookId = '42/subscribers';
			hookFunctions.helpers.httpRequestWithAuthentication.mockResolvedValue({});

			await expect(trigger.webhookMethods.default.delete.call(hookFunctions)).resolves.toBe(true);

			expect(requestedUrls()).toEqual([
				'https://connect.mailerlite.com/api/webhooks/42%2Fsubscribers',
			]);
			expect(staticData.webhookId).toBeUndefined();
		});

		it('should not send a request in delete when the webhook ID has a dot segment', async () => {
			staticData.webhookId = '42/../subscribers';

			await expect(trigger.webhookMethods.default.delete.call(hookFunctions)).resolves.toBe(false);

			expect(hookFunctions.helpers.httpRequestWithAuthentication).not.toHaveBeenCalled();
		});

		it('should return false in delete when the webhook ID is empty', async () => {
			staticData.webhookId = '';

			await expect(trigger.webhookMethods.default.delete.call(hookFunctions)).resolves.toBe(false);

			expect(hookFunctions.helpers.httpRequestWithAuthentication).not.toHaveBeenCalled();
		});
	});
});
