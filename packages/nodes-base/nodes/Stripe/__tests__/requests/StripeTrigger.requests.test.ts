import { mockDeep } from 'vitest-mock-extended';
import type { IHookFunctions, IRequestOptions } from 'n8n-workflow';

import { StripeTrigger } from '../../StripeTrigger.node';

describe('StripeTrigger > Request URLs', () => {
	const webhookId = 'we_1Mr5jULkdIwHu7ix1ibLTM0x';
	const trigger = new StripeTrigger();

	const setup = () => {
		const context = mockDeep<IHookFunctions>();
		context.getWorkflowStaticData.mockReturnValue({ webhookId });
		context.helpers.requestWithAuthentication.mockResolvedValue({ id: webhookId });
		return context;
	};

	const requestedUrls = (context: ReturnType<typeof setup>) =>
		context.helpers.requestWithAuthentication.mock.calls.map(([, options]) => {
			const { method, uri } = options as IRequestOptions;
			return `${method} ${String(uri)}`;
		});

	it('should check the webhook with its ID in the path', async () => {
		const context = setup();

		await trigger.webhookMethods.default.checkExists.call(context);

		expect(requestedUrls(context)).toEqual([
			`GET https://api.stripe.com/v1/webhook_endpoints/${webhookId}`,
		]);
	});

	it('should delete the webhook with its ID in the path', async () => {
		const context = setup();

		await trigger.webhookMethods.default.delete.call(context);

		expect(requestedUrls(context)).toEqual([
			`DELETE https://api.stripe.com/v1/webhook_endpoints/${webhookId}`,
		]);
	});
});
