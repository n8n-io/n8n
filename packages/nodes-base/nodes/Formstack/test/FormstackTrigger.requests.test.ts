import type {
	IHookFunctions,
	ILoadOptionsFunctions,
	IRequestOptions,
	IWebhookFunctions,
} from 'n8n-workflow';
import { mockDeep } from 'jest-mock-extended';

import { FormstackTrigger } from '../FormstackTrigger.node';
import { getFields, getSubmission } from '../GenericFunctions';

describe('FormstackTrigger > request URLs', () => {
	const trigger = new FormstackTrigger();
	const hookContext = mockDeep<IHookFunctions>();
	const loadOptionsContext = mockDeep<ILoadOptionsFunctions>();
	const webhookContext = mockDeep<IWebhookFunctions>();
	const contexts = [hookContext, loadOptionsContext, webhookContext];
	const parameters: Record<string, string> = {
		authentication: 'accessToken',
		formId: '5512345',
	};

	beforeEach(() => {
		jest.clearAllMocks();
		for (const context of contexts) {
			context.getNodeParameter.mockImplementation((name: string) => parameters[name]);
			context.getCredentials.mockResolvedValue({ accessToken: 'fake-token' });
			context.helpers.request.mockResolvedValue({
				webhooks: [],
				id: '889900',
				forms: [],
				fields: [],
				data: [],
			});
		}
		hookContext.getNodeWebhookUrl.mockReturnValue('https://n8n.example.com/webhook/formstack');
		hookContext.getWorkflowStaticData.mockReturnValue({ webhookId: '889900' });
	});

	const requestedUris = () =>
		contexts.flatMap((context) =>
			jest
				.mocked(context.helpers.request)
				.mock.calls.map(([options]) => String((options as IRequestOptions).uri)),
		);

	it('should send the requests to the Formstack API URLs', async () => {
		await trigger.webhookMethods.default.checkExists.call(hookContext);
		await trigger.webhookMethods.default.create.call(hookContext);
		await trigger.webhookMethods.default.delete.call(hookContext);
		await trigger.methods.loadOptions.getForms.call(loadOptionsContext);
		await getFields.call(webhookContext, '5512345');
		await getSubmission.call(webhookContext, '1122334455');

		expect(requestedUris()).toEqual([
			'https://www.formstack.com/api/v2/form/5512345/webhook.json',
			'https://www.formstack.com/api/v2/form/5512345/webhook.json',
			'https://www.formstack.com/api/v2/webhook/889900.json',
			'https://www.formstack.com/api/v2/form.json',
			'https://www.formstack.com/api/v2/form/5512345.json',
			'https://www.formstack.com/api/v2/submission/1122334455.json',
		]);
	});
});
