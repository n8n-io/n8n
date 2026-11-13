import type { IHookFunctions, IRequestOptions } from 'n8n-workflow';
import { mockDeep } from 'jest-mock-extended';

import { LoneScaleTrigger } from '../LoneScaleTrigger.node';

describe('LoneScaleTrigger', () => {
	const webhookUrl = 'https://n8n.example.com/webhook/abc';
	let context: ReturnType<typeof mockDeep<IHookFunctions>>;
	let staticData: { webhookId?: string };

	const requestedUrls = () =>
		context.helpers.requestWithAuthentication.mock.calls.map(([, options]) => {
			const { method, uri } = options as IRequestOptions;
			return `${method} ${String(uri)}`;
		});

	beforeEach(() => {
		context = mockDeep<IHookFunctions>();
		staticData = {};
		context.getWorkflowStaticData.mockReturnValue(staticData);
		context.getNodeWebhookUrl.mockReturnValue(webhookUrl);
		context.getNodeParameter.mockReturnValue('wf_7b21');
		context.getCredentials.mockResolvedValue({ apiKey: 'fake-api-key' });
	});

	it('should send the webhook requests to the workflow hook URL', async () => {
		const { webhookMethods } = new LoneScaleTrigger();
		context.helpers.requestWithAuthentication
			.mockResolvedValueOnce({ target_url: webhookUrl, webhook_id: 'wh_1' })
			.mockResolvedValueOnce({ webhook_id: 'wh_2' })
			.mockResolvedValueOnce({});

		expect(await webhookMethods.default.checkExists.call(context)).toBe(true);
		expect(await webhookMethods.default.create.call(context)).toBe(true);
		expect(await webhookMethods.default.delete.call(context)).toBe(true);

		expect(requestedUrls()).toEqual([
			'GET https://public-api.lonescale.com/workflows/wf_7b21/hook?type=n8n',
			'POST https://public-api.lonescale.com/workflows/wf_7b21/hook',
			'DELETE https://public-api.lonescale.com/workflows/wh_2/hook?type=n8n',
		]);
	});
});
