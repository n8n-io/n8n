import type { IHookFunctions, IRequestOptions } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { PushcutTrigger } from '../PushcutTrigger.node';

describe('PushcutTrigger > request URLs', () => {
	const trigger = new PushcutTrigger();
	const context = mockDeep<IHookFunctions>();

	beforeEach(() => {
		vi.clearAllMocks();
		context.getNodeParameter.mockReturnValue('Open Door');
		context.getCredentials.mockResolvedValue({ apiKey: 'fake-api-key' });
		context.getNodeWebhookUrl.mockReturnValue('https://n8n.example.com/webhook/pushcut');
		context.getWorkflowStaticData.mockImplementation(() => ({
			webhookId: 'zFQUqzFOqJkR9QfaVWbn2',
		}));
		context.helpers.request.mockResolvedValue({ id: 'zFQUqzFOqJkR9QfaVWbn2' });
	});

	const requestedUrls = () =>
		context.helpers.request.mock.calls.map(([options]) => String((options as IRequestOptions).uri));

	it('should send the webhook requests to the Pushcut API URLs', async () => {
		context.helpers.request.mockResolvedValueOnce([]);

		await trigger.webhookMethods.default.checkExists.call(context);
		await trigger.webhookMethods.default.create.call(context);
		await trigger.webhookMethods.default.delete.call(context);

		expect(requestedUrls()).toEqual([
			'https://api.pushcut.io/v1/subscriptions',
			'https://api.pushcut.io/v1/subscriptions',
			'https://api.pushcut.io/v1/subscriptions/zFQUqzFOqJkR9QfaVWbn2',
		]);
	});
});
