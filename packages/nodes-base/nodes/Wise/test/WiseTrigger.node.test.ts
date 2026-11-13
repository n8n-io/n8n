import type { IDataObject, IHookFunctions } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { WiseTrigger } from '../WiseTrigger.node';

describe('WiseTrigger', () => {
	const webhookUrl = 'https://n8n.example.com/webhook/wise';
	let context: ReturnType<typeof mockDeep<IHookFunctions>>;
	let webhookData: IDataObject;

	beforeEach(() => {
		context = mockDeep<IHookFunctions>();
		webhookData = { webhookId: 'a1b2c3d4-0000-4000-8000-000000000001' };
		context.getCredentials.mockResolvedValue({ apiToken: 'token', environment: 'live' });
		context.getWorkflowStaticData.mockReturnValue(webhookData);
		context.getNodeWebhookUrl.mockReturnValue(webhookUrl);
		context.getNodeParameter.mockImplementation((name: string) =>
			name === 'profileId' ? 1001 : 'tranferStateChange',
		);
		context.helpers.httpRequest.mockResolvedValue({ statusCode: 200, body: [] });
	});

	const requestedUrl = () => String(context.helpers.httpRequest.mock.calls[0][0].url);

	it('should request the subscriptions of the profile in checkExists', async () => {
		await new WiseTrigger().webhookMethods.default.checkExists.call(context);

		expect(requestedUrl()).toBe('https://api.wise.com/v3/profiles/1001/subscriptions');
	});

	it('should post to the subscriptions of the profile in create', async () => {
		context.helpers.httpRequest.mockResolvedValue({ statusCode: 200, body: { id: 'new-id' } });

		await new WiseTrigger().webhookMethods.default.create.call(context);

		expect(requestedUrl()).toBe('https://api.wise.com/v3/profiles/1001/subscriptions');
	});

	it('should delete the subscription of the profile in delete', async () => {
		const result = await new WiseTrigger().webhookMethods.default.delete.call(context);

		expect(result).toBe(true);
		expect(requestedUrl()).toBe(
			'https://api.wise.com/v3/profiles/1001/subscriptions/a1b2c3d4-0000-4000-8000-000000000001',
		);
	});
});
