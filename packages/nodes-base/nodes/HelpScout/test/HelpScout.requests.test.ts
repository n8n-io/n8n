import type { IHookFunctions, ILoadOptionsFunctions, IRequestOptions } from 'n8n-workflow';
import { mockDeep } from 'jest-mock-extended';

import { HelpScout } from '../HelpScout.node';
import { HelpScoutTrigger } from '../HelpScoutTrigger.node';

describe('HelpScout > request URLs', () => {
	const hookContext = mockDeep<IHookFunctions>();
	const loadOptionsContext = mockDeep<ILoadOptionsFunctions>();

	beforeEach(() => {
		jest.clearAllMocks();
		for (const context of [hookContext, loadOptionsContext]) {
			context.helpers.requestOAuth2.mockResolvedValue({
				_embedded: { tags: [], mailboxes: [], webhooks: [] },
				headers: { 'resource-id': '7001' },
			});
		}
		hookContext.getNodeParameter.mockReturnValue(['convo.created']);
		hookContext.getNodeWebhookUrl.mockReturnValue('https://n8n.example.com/webhook/helpscout');
		hookContext.getWorkflowStaticData.mockImplementation(() => ({ webhookId: '7001' }));
	});

	const requestedUris = (context: IHookFunctions | ILoadOptionsFunctions) =>
		jest
			.mocked(context.helpers.requestOAuth2)
			.mock.calls.map(([, options]) => String((options as IRequestOptions).uri));

	it('should send the load options requests to the Help Scout API URLs', async () => {
		const node = new HelpScout();
		await node.methods.loadOptions.getTags.call(loadOptionsContext);
		await node.methods.loadOptions.getMailboxes.call(loadOptionsContext);

		expect(requestedUris(loadOptionsContext)).toEqual([
			'https://api.helpscout.net/v2/tags',
			'https://api.helpscout.net/v2/mailboxes',
		]);
	});

	it('should send the webhook requests to the Help Scout API URLs', async () => {
		const trigger = new HelpScoutTrigger();
		await trigger.webhookMethods.default.checkExists.call(hookContext);
		await trigger.webhookMethods.default.create.call(hookContext);
		await trigger.webhookMethods.default.delete.call(hookContext);

		expect(requestedUris(hookContext)).toEqual([
			'https://api.helpscout.net/v2/webhooks',
			'https://api.helpscout.net/v2/webhooks',
			'https://api.helpscout.net/v2/webhooks/7001',
		]);
	});
});
