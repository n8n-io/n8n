import type { IDataObject, IHookFunctions } from 'n8n-workflow';
import { mockDeep } from 'jest-mock-extended';

import { PostmarkTrigger } from '../PostmarkTrigger.node';

describe('PostmarkTrigger', () => {
	const trigger = new PostmarkTrigger();
	const webhookUrl = 'https://n8n.example.com/webhook/postmark';
	let context: ReturnType<typeof mockDeep<IHookFunctions>>;
	let staticData: IDataObject;

	const requestUrls = () =>
		context.helpers.requestWithAuthentication.mock.calls.map(([credentialType, options]) => [
			credentialType,
			options.method,
			String(options.uri),
		]);

	beforeEach(() => {
		context = mockDeep<IHookFunctions>();
		staticData = {};
		context.getNodeWebhookUrl.mockReturnValue(webhookUrl);
		context.getWorkflowStaticData.mockReturnValue(staticData);
		context.getNodeParameter.mockImplementation((name: string) =>
			name === 'events' ? ['click'] : false,
		);
	});

	it('should request the webhooks endpoint to check for a webhook', async () => {
		context.helpers.requestWithAuthentication.mockResolvedValue({ Webhooks: [] });

		await trigger.webhookMethods.default.checkExists.call(context);

		expect(requestUrls()).toEqual([['postmarkApi', 'GET', 'https://api.postmarkapp.com/webhooks']]);
	});

	it('should request the webhooks endpoint to create a webhook', async () => {
		context.helpers.requestWithAuthentication.mockResolvedValue({ ID: 1234567 });

		await trigger.webhookMethods.default.create.call(context);

		expect(requestUrls()).toEqual([
			['postmarkApi', 'POST', 'https://api.postmarkapp.com/webhooks'],
		]);
		expect(staticData.webhookId).toBe(1234567);
	});

	it('should request the webhook endpoint to delete a webhook', async () => {
		staticData.webhookId = 1234567;
		context.helpers.requestWithAuthentication.mockResolvedValue({});

		await trigger.webhookMethods.default.delete.call(context);

		expect(requestUrls()).toEqual([
			['postmarkApi', 'DELETE', 'https://api.postmarkapp.com/webhooks/1234567'],
		]);
	});

	it('should encode a webhook ID that contains a slash', async () => {
		staticData.webhookId = '1234567/servers';
		context.helpers.requestWithAuthentication.mockResolvedValue({});

		await trigger.webhookMethods.default.delete.call(context);

		expect(requestUrls()).toEqual([
			['postmarkApi', 'DELETE', 'https://api.postmarkapp.com/webhooks/1234567%2Fservers'],
		]);
	});

	it('should reject a webhook ID with a dot segment', async () => {
		staticData.webhookId = '1234567/../servers';
		context.helpers.requestWithAuthentication.mockResolvedValue({});

		await expect(trigger.webhookMethods.default.delete.call(context)).rejects.toThrow(
			'Invalid identifier',
		);

		expect(context.helpers.requestWithAuthentication).not.toHaveBeenCalled();
	});
});
