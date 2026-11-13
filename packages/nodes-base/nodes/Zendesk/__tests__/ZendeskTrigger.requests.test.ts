import type { IDataObject, IHookFunctions, IRequestOptions } from 'n8n-workflow';
import { mockDeep } from 'jest-mock-extended';

import { ZendeskTrigger } from '../ZendeskTrigger.node';

describe('ZendeskTrigger > request URLs', () => {
	const trigger = new ZendeskTrigger();

	const parameters: IDataObject = {
		authentication: 'apiToken',
		service: 'support',
		conditions: { all: [{ field: 'status', operation: 'is', value: 'open' }] },
		options: {},
	};

	it('should send the webhook requests to the Zendesk API URLs', async () => {
		const context = mockDeep<IHookFunctions>();
		const staticData: IDataObject = {};
		context.getCredentials.mockResolvedValue({ subdomain: 'acme' });
		context.getNodeParameter.mockImplementation((name: string) => parameters[name]);
		context.getNodeWebhookUrl.mockReturnValue('https://n8n.example.com/webhook/zendesk');
		context.getWorkflowStaticData.mockReturnValue(staticData);
		context.helpers.requestWithAuthentication
			.mockResolvedValueOnce({ webhook: { id: '01HWEBHOOK' } })
			.mockResolvedValueOnce({ signing_secret: { secret: 'fake-secret' } })
			.mockResolvedValueOnce({ trigger: { id: 9001 } })
			.mockResolvedValueOnce({})
			.mockResolvedValueOnce({});

		await trigger.webhookMethods.default.create.call(context);
		await trigger.webhookMethods.default.delete.call(context);

		const requestedUrls = context.helpers.requestWithAuthentication.mock.calls.map(([, options]) =>
			String((options as IRequestOptions).uri),
		);
		expect(requestedUrls).toEqual([
			'https://acme.zendesk.com/api/v2/webhooks',
			'https://acme.zendesk.com/api/v2/webhooks/01HWEBHOOK/signing_secret',
			'https://acme.zendesk.com/api/v2/triggers.json',
			'https://acme.zendesk.com/api/v2/triggers/9001.json',
			'https://acme.zendesk.com/api/v2/webhooks/01HWEBHOOK',
		]);
	});
});
