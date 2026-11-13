import { mockDeep } from 'vitest-mock-extended';
import type { IHookFunctions, INode, IRequestOptions } from 'n8n-workflow';

import { HubspotTrigger } from '../HubspotTrigger.node';

describe('HubspotTrigger webhook methods', () => {
	const { webhookMethods } = new HubspotTrigger();

	const setup = () => {
		const context = mockDeep<IHookFunctions>();
		context.getNode.mockReturnValue({ type: 'n8n-nodes-base.hubspotTrigger' } as INode);
		context.getCredentials.mockResolvedValue({ appId: '1234567', apiKey: 'fake-key' });
		context.getNodeWebhookUrl.mockReturnValue('https://n8n.example.com/webhook/abc');
		context.getNodeParameter.mockImplementation((name: string) => {
			if (name === 'eventsUi') return { eventValues: [{ name: 'contact.creation' }] };
			if (name === 'additionalFields') return {};
			return 'developerApi';
		});
		return context;
	};

	const requests = (context: ReturnType<typeof setup>) =>
		context.helpers.request.mock.calls.map(([options]) => {
			const { method, uri } = options as IRequestOptions;
			return [method, String(uri)];
		});

	it('should send create requests to the app webhook URLs', async () => {
		const context = setup();

		await webhookMethods.default.create.call(context);

		expect(requests(context)).toEqual([
			['PUT', 'https://api.hubapi.com/webhooks/v3/1234567/settings'],
			['POST', 'https://api.hubapi.com/webhooks/v3/1234567/subscriptions'],
		]);
	});

	it('should send delete requests to the app webhook URLs', async () => {
		const context = setup();
		context.helpers.request.mockResolvedValueOnce({ results: [{ id: 98765 }] });

		await webhookMethods.default.delete.call(context);

		expect(requests(context)).toEqual([
			['GET', 'https://api.hubapi.com/webhooks/v3/1234567/subscriptions'],
			['DELETE', 'https://api.hubapi.com/webhooks/v3/1234567/subscriptions/98765'],
			['DELETE', 'https://api.hubapi.com/webhooks/v3/1234567/settings'],
		]);
	});

	it('should send check requests to the app webhook URLs', async () => {
		const context = setup();
		context.helpers.request
			.mockResolvedValueOnce({ targetUrl: 'https://n8n.example.com/webhook/abc' })
			.mockResolvedValueOnce({ results: [{ id: 98765 }] });

		await webhookMethods.default.checkExists.call(context);

		expect(requests(context)).toEqual([
			['GET', 'https://api.hubapi.com/webhooks/v3/1234567/settings'],
			['GET', 'https://api.hubapi.com/webhooks/v3/1234567/subscriptions'],
			['DELETE', 'https://api.hubapi.com/webhooks/v3/1234567/subscriptions/98765'],
			['DELETE', 'https://api.hubapi.com/webhooks/v3/1234567/settings'],
		]);
	});
});
