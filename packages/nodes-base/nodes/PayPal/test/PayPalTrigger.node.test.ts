import { mockDeep } from 'jest-mock-extended';
import type { IHookFunctions, IRequestOptions } from 'n8n-workflow';

import { PayPalTrigger } from '../PayPalTrigger.node';

describe('PayPalTrigger webhook methods', () => {
	it.each(['checkExists', 'delete'] as const)(
		'%s should request the webhook URL',
		async (method) => {
			const context = mockDeep<IHookFunctions>();
			context.getCredentials.mockResolvedValue({
				clientId: 'fake-client-id',
				secret: 'fake-secret',
				env: 'live',
			});
			context.getWorkflowStaticData.mockReturnValue({ webhookId: 'WH-4MW588624F6875438' });
			context.helpers.request.mockResolvedValue({ access_token: 'fake-access-token' });

			await new PayPalTrigger().webhookMethods.default[method].call(context);

			expect(
				context.helpers.request.mock.calls.map(([options]) =>
					String((options as IRequestOptions).uri),
				),
			).toEqual([
				'https://api-m.paypal.com/v1/oauth2/token',
				'https://api-m.paypal.com/v1/notifications/webhooks/WH-4MW588624F6875438',
			]);
		},
	);
});
