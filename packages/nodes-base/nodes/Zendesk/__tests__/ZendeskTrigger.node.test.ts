import { ZendeskTrigger } from '../ZendeskTrigger.node';
import * as GenericFunctions from '../GenericFunctions';
import * as ZendeskTriggerHelpers from '../ZendeskTriggerHelpers';

describe('ZendeskTrigger Node', () => {
	describe('create webhook method', () => {
		let mockThis: any;
		let webhookData: Record<string, any>;

		beforeEach(() => {
			webhookData = {};
			mockThis = {
				getNodeWebhookUrl: () => 'https://example.com/webhook',
				getNodeParameter: jest.fn().mockImplementation((name: string) => {
					if (name === 'service') return 'support';
					if (name === 'conditions')
						return { all: [{ field: 'status', operation: 'is', value: 'open' }] };
					if (name === 'options') return {};
				}),
				getWorkflowStaticData: () => webhookData,
				getNode: () => ({}),
			};
		});

		it('should fetch and store signing secret after creating webhook', async () => {
			const createdWebhook = { id: 'webhook-123' };
			const signingSecretResponse = { signing_secret: { secret: 'test-signing-secret' } };
			const createdTrigger = { id: 'trigger-456' };

			jest
				.spyOn(GenericFunctions, 'zendeskApiRequest')
				.mockResolvedValueOnce({ webhook: createdWebhook }) // POST /webhooks
				.mockResolvedValueOnce(signingSecretResponse) // GET /webhooks/{id}/signing_secret
				.mockResolvedValueOnce({ trigger: createdTrigger }); // POST /triggers

			const trigger = new ZendeskTrigger();
			const result = await trigger.webhookMethods.default.create.call(mockThis);

			expect(result).toBe(true);
			expect(webhookData.webhookSecret).toBe('test-signing-secret');
			expect(webhookData.webhookId).toBe('trigger-456');
			expect(webhookData.targetId).toBe('webhook-123');
		});

		it('should call signing_secret API with correct webhook ID', async () => {
			const createdWebhook = { id: 'webhook-789' };
			const signingSecretResponse = { signing_secret: { secret: 'secret-123' } };
			const createdTrigger = { id: 'trigger-101' };

			const apiRequestSpy = jest
				.spyOn(GenericFunctions, 'zendeskApiRequest')
				.mockResolvedValueOnce({ webhook: createdWebhook })
				.mockResolvedValueOnce(signingSecretResponse)
				.mockResolvedValueOnce({ trigger: createdTrigger });

			const trigger = new ZendeskTrigger();
			await trigger.webhookMethods.default.create.call(mockThis);

			expect(apiRequestSpy).toHaveBeenCalledWith('GET', '/webhooks/webhook-789/signing_secret');
		});
	});

	describe('delete webhook method', () => {
		let webhookData: Record<string, any>;
		let mockThis: any;

		beforeEach(() => {
			webhookData = {
				webhookId: 'trigger-123',
				targetId: 'webhook-456',
				webhookSecret: 'test-secret',
			};

			mockThis = {
				getWorkflowStaticData: () => webhookData,
			};
		});

		it('should delete webhook data including secret when deletion succeeds', async () => {
			jest
				.spyOn(GenericFunctions, 'zendeskApiRequest')
				.mockResolvedValueOnce({}) // DELETE /triggers
				.mockResolvedValueOnce({}); // DELETE /webhooks

			const trigger = new ZendeskTrigger();
			const result = await trigger.webhookMethods.default.delete.call(mockThis);

			expect(result).toBe(true);
			expect(webhookData.webhookId).toBeUndefined();
			expect(webhookData.targetId).toBeUndefined();
			expect(webhookData.webhookSecret).toBeUndefined();
		});

		it('should return false when deletion fails', async () => {
			jest
				.spyOn(GenericFunctions, 'zendeskApiRequest')
				.mockRejectedValueOnce(new Error('API error'));

			const trigger = new ZendeskTrigger();
			const result = await trigger.webhookMethods.default.delete.call(mockThis);

			expect(result).toBe(false);
		});
	});

	describe('webhook method', () => {
		let mockThis: any;
		let webhookData: Record<string, any>;

		beforeEach(() => {
			webhookData = {
				webhookSecret: 'test-secret',
			};

			mockThis = {
				getWorkflowStaticData: () => webhookData,
				getResponseObject: jest.fn().mockReturnValue({
					status: jest.fn().mockReturnThis(),
					send: jest.fn().mockReturnThis(),
					end: jest.fn(),
				}),
				getRequestObject: jest.fn().mockReturnValue({
					body: { ticket: { id: '123' } },
					rawBody: '{"ticket":{"id":"123"}}',
				}),
				getHeaderData: jest.fn().mockReturnValue({}),
				helpers: {
					returnJsonArray: jest.fn().mockImplementation((data) => [data]),
				},
			};
		});

		it('should reject with 401 when signature verification fails', async () => {
			jest.spyOn(ZendeskTriggerHelpers, 'verifySignature').mockReturnValueOnce(false);

			const trigger = new ZendeskTrigger();
			const result = await trigger.webhook.call(mockThis);

			expect(result).toEqual({ noWebhookResponse: true });
			expect(mockThis.getResponseObject).toHaveBeenCalled();
			const responseObj = mockThis.getResponseObject();
			expect(responseObj.status).toHaveBeenCalledWith(401);
			expect(responseObj.send).toHaveBeenCalledWith('Unauthorized');
		});

		it('should process webhook when signature verification succeeds', async () => {
			jest.spyOn(ZendeskTriggerHelpers, 'verifySignature').mockReturnValueOnce(true);

			const trigger = new ZendeskTrigger();
			const result = await trigger.webhook.call(mockThis);

			expect(result).toHaveProperty('workflowData');
			expect(mockThis.helpers.returnJsonArray).toHaveBeenCalledWith({ ticket: { id: '123' } });
		});

		it('should return workflow data with the request body', async () => {
			jest.spyOn(ZendeskTriggerHelpers, 'verifySignature').mockReturnValueOnce(true);

			const trigger = new ZendeskTrigger();
			const result = await trigger.webhook.call(mockThis);

			expect(result.workflowData).toBeDefined();
			expect(result.workflowData).toHaveLength(1);
		});
	});
});
