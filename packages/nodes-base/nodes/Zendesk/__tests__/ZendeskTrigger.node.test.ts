import type { IHookFunctions } from 'n8n-workflow';
import { ZendeskTrigger } from '../ZendeskTrigger.node';
import * as GenericFunctions from '../GenericFunctions';
import * as ZendeskTriggerHelpers from '../ZendeskTriggerHelpers';

const WEBHOOK_URL = 'https://n8n.example.com/webhook/abc123';
const ZENDESK_WEBHOOK_ID = 'zd-webhook-111';
const ZENDESK_TRIGGER_ID = 'zd-trigger-222';

function makeCheckExistsContext(webhookData: Record<string, unknown> = {}): IHookFunctions {
	return {
		getNodeWebhookUrl: () => WEBHOOK_URL,
		getWorkflowStaticData: () => webhookData,
	} as unknown as IHookFunctions;
}

const matchingWebhook = { id: ZENDESK_WEBHOOK_ID, endpoint: WEBHOOK_URL };

const ownTrigger = {
	id: ZENDESK_TRIGGER_ID,
	actions: [{ field: 'notification_webhook', value: [ZENDESK_WEBHOOK_ID, '{}'] }],
};

const siblingTrigger = {
	id: 'zd-trigger-sibling',
	actions: [{ field: 'notification_webhook', value: [ZENDESK_WEBHOOK_ID, '{}'] }],
};

describe('ZendeskTrigger Node', () => {
	describe('create webhook method', () => {
		let mockThis: any;
		let webhookData: Record<string, any>;

		beforeEach(() => {
			jest.clearAllMocks();
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

		it('should reuse the existing Zendesk webhook and skip POST /webhooks when targetId is already stored', async () => {
			webhookData.targetId = 'existing-webhook-456';
			const signingSecretResponse = { signing_secret: { secret: 'reused-secret' } };
			const createdTrigger = { id: 'trigger-789' };

			const apiRequestSpy = jest
				.spyOn(GenericFunctions, 'zendeskApiRequest')
				.mockResolvedValueOnce(signingSecretResponse) // GET /webhooks/{id}/signing_secret
				.mockResolvedValueOnce({ trigger: createdTrigger }); // POST /triggers

			const trigger = new ZendeskTrigger();
			const result = await trigger.webhookMethods.default.create.call(mockThis);

			expect(result).toBe(true);
			expect(webhookData.targetId).toBe('existing-webhook-456');
			expect(webhookData.webhookSecret).toBe('reused-secret');
			expect(webhookData.webhookId).toBe('trigger-789');

			// POST /webhooks must not be called when a webhook already exists
			const postWebhookCalls = apiRequestSpy.mock.calls.filter(
				([method, path]) => method === 'POST' && path === '/webhooks',
			);
			expect(postWebhookCalls).toHaveLength(0);
		});
	});

	describe('delete webhook method', () => {
		let webhookData: Record<string, any>;
		let mockThis: any;

		beforeEach(() => {
			jest.clearAllMocks();
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
			jest.spyOn(GenericFunctions, 'zendeskApiRequestAllItems').mockResolvedValueOnce([]); // no remaining triggers → webhook can be deleted

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

		it('should clear static data even when the API call fails, so the next activation does not try to reuse a deleted webhook', async () => {
			jest
				.spyOn(GenericFunctions, 'zendeskApiRequest')
				.mockRejectedValueOnce(new Error('404 Not Found'));

			const trigger = new ZendeskTrigger();
			await trigger.webhookMethods.default.delete.call(mockThis);

			// Stale IDs must be gone so the next activation does not try to reuse
			// a Zendesk webhook that no longer exists (e.g. deleted via duplication).
			expect(webhookData.webhookId).toBeUndefined();
			expect(webhookData.targetId).toBeUndefined();
			expect(webhookData.webhookSecret).toBeUndefined();
		});

		it('should not delete the Zendesk webhook when a sibling trigger still references it, so the duplicate workflow keeps receiving events', async () => {
			const apiRequestSpy = jest
				.spyOn(GenericFunctions, 'zendeskApiRequest')
				.mockResolvedValueOnce({}); // DELETE /triggers
			jest.spyOn(GenericFunctions, 'zendeskApiRequestAllItems').mockResolvedValueOnce([
				// A sibling trigger still points at the same webhook
				{
					actions: [{ field: 'notification_webhook', value: [webhookData.targetId, '{}'] }],
				},
			]);

			const trigger = new ZendeskTrigger();
			const result = await trigger.webhookMethods.default.delete.call(mockThis);

			expect(result).toBe(true);

			// DELETE /webhooks must not have been called
			const deleteWebhookCalls = apiRequestSpy.mock.calls.filter(
				([method, path]) =>
					method === 'DELETE' && typeof path === 'string' && path.startsWith('/webhooks'),
			);
			expect(deleteWebhookCalls).toHaveLength(0);
		});
	});

	describe('checkExists webhook method', () => {
		beforeEach(() => {
			jest.clearAllMocks();
		});

		it('should return false and clear stale IDs when the webhook is not found in Zendesk, so create() starts fresh instead of reusing a deleted webhook', async () => {
			jest.spyOn(GenericFunctions, 'zendeskApiRequest').mockResolvedValueOnce({
				webhooks: [{ id: 'other-id', endpoint: 'https://other.example.com' }],
			});

			const webhookData: Record<string, unknown> = {
				targetId: 'stale-webhook-id',
				webhookId: 'stale-trigger-id',
			};
			const trigger = new ZendeskTrigger();

			const result = await trigger.webhookMethods.default.checkExists.call(
				makeCheckExistsContext(webhookData),
			);

			expect(result).toBe(false);
			expect(webhookData.targetId).toBeUndefined();
			expect(webhookData.webhookId).toBeUndefined();
		});

		it('should return false without fetching triggers on first activation, so create() registers a trigger for the existing webhook without an unnecessary API call', async () => {
			jest
				.spyOn(GenericFunctions, 'zendeskApiRequest')
				.mockResolvedValueOnce({ webhooks: [matchingWebhook] });
			const allItemsSpy = jest.spyOn(GenericFunctions, 'zendeskApiRequestAllItems');

			const webhookData: Record<string, unknown> = {};
			const trigger = new ZendeskTrigger();

			const result = await trigger.webhookMethods.default.checkExists.call(
				makeCheckExistsContext(webhookData),
			);

			expect(result).toBe(false);
			expect(webhookData.targetId).toBe(ZENDESK_WEBHOOK_ID);
			// Triggers API must not be called — we know we need to create without checking
			expect(allItemsSpy).not.toHaveBeenCalled();
		});

		it('should return true when both the webhook and our trigger are confirmed in Zendesk, so create() is skipped and the existing setup is preserved', async () => {
			jest
				.spyOn(GenericFunctions, 'zendeskApiRequest')
				.mockResolvedValueOnce({ webhooks: [matchingWebhook] });
			jest.spyOn(GenericFunctions, 'zendeskApiRequestAllItems').mockResolvedValueOnce([ownTrigger]);

			const webhookData: Record<string, unknown> = {
				targetId: ZENDESK_WEBHOOK_ID,
				webhookId: ZENDESK_TRIGGER_ID,
			};
			const trigger = new ZendeskTrigger();

			const result = await trigger.webhookMethods.default.checkExists.call(
				makeCheckExistsContext(webhookData),
			);

			expect(result).toBe(true);
			expect(webhookData.targetId).toBe(ZENDESK_WEBHOOK_ID);
			expect(webhookData.webhookId).toBe(ZENDESK_TRIGGER_ID);
		});

		it('should return false and clear the stale trigger ID when the webhook exists but our trigger is gone, so create() makes a new trigger without being blocked by the invalid ID', async () => {
			jest
				.spyOn(GenericFunctions, 'zendeskApiRequest')
				.mockResolvedValueOnce({ webhooks: [matchingWebhook] });
			jest.spyOn(GenericFunctions, 'zendeskApiRequestAllItems').mockResolvedValueOnce([]);

			const webhookData: Record<string, unknown> = {
				targetId: ZENDESK_WEBHOOK_ID,
				webhookId: ZENDESK_TRIGGER_ID,
			};
			const trigger = new ZendeskTrigger();

			const result = await trigger.webhookMethods.default.checkExists.call(
				makeCheckExistsContext(webhookData),
			);

			expect(result).toBe(false);
			expect(webhookData.targetId).toBe(ZENDESK_WEBHOOK_ID); // webhook still present
			expect(webhookData.webhookId).toBeUndefined(); // stale trigger ID cleared
		});

		it("should not issue any DELETE calls for triggers it does not own, so a duplicated workflow cannot silently destroy the original workflow's Zendesk trigger", async () => {
			const apiRequestSpy = jest
				.spyOn(GenericFunctions, 'zendeskApiRequest')
				.mockResolvedValueOnce({ webhooks: [matchingWebhook] });
			jest
				.spyOn(GenericFunctions, 'zendeskApiRequestAllItems')
				.mockResolvedValueOnce([siblingTrigger]);

			// Our stored webhookId is different from the sibling's trigger ID
			const webhookData: Record<string, unknown> = {
				targetId: ZENDESK_WEBHOOK_ID,
				webhookId: ZENDESK_TRIGGER_ID,
			};
			const trigger = new ZendeskTrigger();

			await trigger.webhookMethods.default.checkExists.call(makeCheckExistsContext(webhookData));

			const deleteCalls = apiRequestSpy.mock.calls.filter(([method]) => method === 'DELETE');
			expect(deleteCalls).toHaveLength(0);
		});

		it('should not match a trigger whose action field is not notification_webhook, so unrelated Zendesk triggers with coincidental IDs are never treated as ours', async () => {
			jest
				.spyOn(GenericFunctions, 'zendeskApiRequest')
				.mockResolvedValueOnce({ webhooks: [matchingWebhook] });
			jest.spyOn(GenericFunctions, 'zendeskApiRequestAllItems').mockResolvedValueOnce([
				// Same ID as our stored webhookId but wrong action type
				{
					id: ZENDESK_TRIGGER_ID,
					actions: [{ field: 'notification_user', value: ['user@example.com'] }],
				},
			]);

			const webhookData: Record<string, unknown> = {
				targetId: ZENDESK_WEBHOOK_ID,
				webhookId: ZENDESK_TRIGGER_ID,
			};
			const trigger = new ZendeskTrigger();

			const result = await trigger.webhookMethods.default.checkExists.call(
				makeCheckExistsContext(webhookData),
			);

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
