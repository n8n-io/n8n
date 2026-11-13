import { mockDeep } from 'jest-mock-extended';
import type { IHookFunctions } from 'n8n-workflow';

import { ShopifyTrigger } from '../ShopifyTrigger.node';

const baseUrl = 'https://acme-store.myshopify.com/admin/api/2024-07/';

describe('ShopifyTrigger webhook methods', () => {
	const trigger = new ShopifyTrigger();
	const webhookUrl = 'https://n8n.example.com/webhook/abc';
	let context: ReturnType<typeof mockDeep<IHookFunctions>>;
	let webhookData: { webhookId?: string };

	beforeEach(() => {
		context = mockDeep<IHookFunctions>();
		webhookData = { webhookId: '4759306' };
		context.getNodeParameter.mockImplementation((name: string) =>
			name === 'authentication' ? 'accessToken' : 'orders/create',
		);
		context.getCredentials.mockResolvedValue({ shopSubdomain: 'acme-store' });
		context.getWorkflowStaticData.mockReturnValue(webhookData);
		context.getNodeWebhookUrl.mockReturnValue(webhookUrl);
	});

	const requestedUrl = () => String(context.helpers.requestWithAuthentication.mock.calls[0][1].uri);

	it('should list webhooks', async () => {
		context.helpers.requestWithAuthentication.mockResolvedValue({ webhooks: [] });

		await trigger.webhookMethods.default.checkExists.call(context);

		expect(requestedUrl()).toBe(`${baseUrl}/webhooks`);
	});

	it('should create a webhook', async () => {
		context.helpers.requestWithAuthentication.mockResolvedValue({ webhook: { id: 4759306 } });

		await trigger.webhookMethods.default.create.call(context);

		expect(requestedUrl()).toBe(`${baseUrl}/webhooks.json`);
	});

	it('should delete a webhook', async () => {
		context.helpers.requestWithAuthentication.mockResolvedValue({});

		await trigger.webhookMethods.default.delete.call(context);

		expect(requestedUrl()).toBe(`${baseUrl}/webhooks/4759306.json`);
	});
});
