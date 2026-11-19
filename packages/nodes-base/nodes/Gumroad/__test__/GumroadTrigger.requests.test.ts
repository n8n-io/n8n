import type { IHookFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { GumroadTrigger } from '../GumroadTrigger.node';

describe('GumroadTrigger > request URLs', () => {
	const trigger = new GumroadTrigger();
	const context = mockDeep<IHookFunctions>();
	const parameters: Record<string, string> = {
		authentication: 'accessToken',
		resource: 'sale',
	};

	beforeEach(() => {
		vi.clearAllMocks();
		context.getNodeParameter.mockImplementation((name: string) => parameters[name]);
		context.getNodeWebhookUrl.mockReturnValue('https://n8n.example.com/webhook/gumroad');
		context.getWorkflowStaticData.mockImplementation(() => ({
			webhookId: 'Wy4mhYbEhZzqTqzzQyd9Ew==',
		}));
		context.helpers.httpRequestWithAuthentication.mockResolvedValue({
			success: true,
			resource_subscriptions: [],
			resource_subscription: { id: 'Wy4mhYbEhZzqTqzzQyd9Ew==' },
		});
	});

	const requestedUrls = () =>
		context.helpers.httpRequestWithAuthentication.mock.calls.map(([, options]) =>
			String((options as IHttpRequestOptions).url),
		);

	it('should send the webhook requests to the Gumroad API URLs', async () => {
		await trigger.webhookMethods.default.checkExists.call(context);
		await trigger.webhookMethods.default.create.call(context);
		await trigger.webhookMethods.default.delete.call(context);

		expect(requestedUrls()).toEqual([
			'https://api.gumroad.com/v2/resource_subscriptions',
			'https://api.gumroad.com/v2/resource_subscriptions',
			'https://api.gumroad.com/v2/resource_subscriptions/Wy4mhYbEhZzqTqzzQyd9Ew==',
		]);
	});
});
