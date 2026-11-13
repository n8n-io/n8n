import type { IHookFunctions, IRequestOptions } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { FlowTrigger } from '../FlowTrigger.node';

describe('FlowTrigger > request URLs', () => {
	const trigger = new FlowTrigger();
	const context = mockDeep<IHookFunctions>();
	const parameters: Record<string, string> = {
		resource: 'task',
		taskIds: '123',
	};

	beforeEach(() => {
		vi.clearAllMocks();
		context.getNodeParameter.mockImplementation((name: string) => parameters[name]);
		context.getCredentials.mockResolvedValue({ organizationId: 9, accessToken: 'fake-token' });
		context.getNodeWebhookUrl.mockReturnValue('https://n8n.example.com/webhook/flow');
		context.getWorkflowStaticData.mockImplementation(() => ({ webhookIds: [5001] }));
		context.helpers.request.mockResolvedValue({
			integration_webhooks: [],
			integration_webhook: { id: 5001 },
		});
	});

	const requestedUris = () =>
		context.helpers.request.mock.calls.map(([options]) => String((options as IRequestOptions).uri));

	it('should send the webhook requests to the Flow API URLs', async () => {
		await trigger.webhookMethods.default.checkExists.call(context);
		await trigger.webhookMethods.default.create.call(context);
		await trigger.webhookMethods.default.delete.call(context);

		expect(requestedUris()).toEqual([
			'https://api.getflow.com/v2/integration_webhooks',
			'https://api.getflow.com/v2/integration_webhooks',
			'https://api.getflow.com/v2/integration_webhooks/5001',
		]);
	});
});
