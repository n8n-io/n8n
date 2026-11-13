import { mockDeep } from 'jest-mock-extended';
import type { IHookFunctions, IRequestOptions } from 'n8n-workflow';

import { GumroadTrigger } from '../GumroadTrigger.node';

describe('GumroadTrigger > request URLs', () => {
	const trigger = new GumroadTrigger();
	const context = mockDeep<IHookFunctions>();
	const parameters: Record<string, string> = {
		resource: 'sale',
	};

	beforeEach(() => {
		jest.clearAllMocks();
		context.getCredentials.mockResolvedValue({ accessToken: 'fake-token' });
		context.getNodeParameter.mockImplementation((name: string) => parameters[name]);
		context.getNodeWebhookUrl.mockReturnValue('https://n8n.example.com/webhook/gumroad');
		context.getWorkflowStaticData.mockImplementation(() => ({
			webhookId: 'Wy4mhYbEhZzqTqzzQyd9Ew==',
		}));
		context.helpers.request.mockResolvedValue({
			success: true,
			resource_subscriptions: [],
			resource_subscription: { id: 'Wy4mhYbEhZzqTqzzQyd9Ew==' },
		});
	});

	const requestedUrls = () =>
		context.helpers.request.mock.calls.map(([options]) => String((options as IRequestOptions).uri));

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
