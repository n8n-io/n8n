import type { IHookFunctions, INode, IRequestOptions, IWebhookFunctions } from 'n8n-workflow';
import { mockDeep } from 'jest-mock-extended';

import { StravaTrigger } from '../StravaTrigger.node';

const node = { type: 'n8n-nodes-base.stravaTrigger' } as INode;

describe('Strava Trigger request URLs', () => {
	it.each([
		['activity', 'https://www.strava.com/api/v3/activities/1234567890'],
		['athlete', 'https://www.strava.com/api/v3/athletes/1234567890/stats'],
	])('should request the %s object from the event', async (objectType, url) => {
		const context = mockDeep<IWebhookFunctions>();
		context.getNode.mockReturnValue(node);
		context.getBodyData.mockReturnValue({
			object_type: objectType,
			aspect_type: 'create',
			object_id: 1234567890,
			subscription_id: 98765,
		});
		context.getWorkflowStaticData.mockReturnValue({ webhookId: 98765 });
		context.getQueryData.mockReturnValue({});
		context.getWebhookName.mockReturnValue('default');
		context.getNodeParameter.mockImplementation((name: string) =>
			name === 'resolveData' ? true : '*',
		);
		context.helpers.requestOAuth2.mockResolvedValue({});

		await new StravaTrigger().webhook.call(context);

		expect(String(context.helpers.requestOAuth2.mock.calls[0][1].uri)).toBe(url);
	});

	it('should delete the subscription by its ID', async () => {
		const context = mockDeep<IHookFunctions>();
		context.getNode.mockReturnValue(node);
		context.getWorkflowStaticData.mockReturnValue({ webhookId: 98765 });
		context.getCredentials.mockResolvedValue({
			clientId: 'test-client-id',
			clientSecret: 'test-client-secret',
		});
		context.helpers.request.mockResolvedValue({});

		await new StravaTrigger().webhookMethods.default.delete.call(context);

		expect(String((context.helpers.request.mock.calls[0][0] as IRequestOptions).uri)).toBe(
			'https://www.strava.com/api/v3/push_subscriptions/98765',
		);
	});
});
