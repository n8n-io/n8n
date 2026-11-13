import type { IHookFunctions, ILoadOptionsFunctions, IRequestOptions } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { WufooTrigger } from '../WufooTrigger.node';

describe('WufooTrigger > request URLs', () => {
	const trigger = new WufooTrigger();

	const requestedUrls = (context: IHookFunctions | ILoadOptionsFunctions) =>
		vi
			.mocked(context.helpers.requestWithAuthentication)
			.mock.calls.map(([, options]) => String((options as IRequestOptions).uri));

	it('should load the forms from the Wufoo API URL', async () => {
		const context = mockDeep<ILoadOptionsFunctions>();
		context.getCredentials.mockResolvedValue({ subdomain: 'acme', apiKey: 'fake-api-key' });
		context.helpers.requestWithAuthentication.mockResolvedValue({ Forms: [] });

		await trigger.methods.loadOptions.getForms.call(context);

		expect(requestedUrls(context)).toEqual(['https://acme.wufoo.com/api/v3/forms.json']);
	});

	it('should send the webhook requests to the Wufoo API URLs', async () => {
		const context = mockDeep<IHookFunctions>();
		const staticData = {};
		context.getCredentials.mockResolvedValue({ subdomain: 'acme', apiKey: 'fake-api-key' });
		context.getNodeParameter.mockReturnValue('z1x2c3v4');
		context.getNodeWebhookUrl.mockReturnValue('https://n8n.example.com/webhook/wufoo');
		context.getWorkflowStaticData.mockReturnValue(staticData);
		context.helpers.requestWithAuthentication.mockResolvedValue({
			WebHookPutResult: { Hash: 'w9e8r7t6' },
		});

		await trigger.webhookMethods.default.create.call(context);
		await trigger.webhookMethods.default.delete.call(context);

		expect(requestedUrls(context)).toEqual([
			'https://acme.wufoo.com/api/v3/forms/z1x2c3v4/webhooks.json',
			'https://acme.wufoo.com/api/v3/forms/z1x2c3v4/webhooks/w9e8r7t6.json',
		]);
	});
});
