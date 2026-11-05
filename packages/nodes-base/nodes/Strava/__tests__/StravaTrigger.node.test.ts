import type * as express from 'express';
import type { IDataObject, IHookFunctions, IWebhookFunctions } from 'n8n-workflow';
import { mock, mockDeep } from 'vitest-mock-extended';

import * as GenericFunctions from '../GenericFunctions';
import { StravaTrigger } from '../StravaTrigger.node';

describe('StravaTrigger', () => {
	const node = new StravaTrigger();
	const nodeId = 'test-node-id';

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('checkExists', () => {
		it('should store the id of an existing subscription for the webhook URL', async () => {
			const hookFunctions = mockDeep<IHookFunctions>();
			const staticData: IDataObject = {};
			hookFunctions.getNodeWebhookUrl.mockReturnValue('https://n8n.example/webhook');
			hookFunctions.getWorkflowStaticData.mockReturnValue(staticData);
			vi.spyOn(GenericFunctions, 'stravaApiRequest').mockResolvedValue([
				{ id: 123, callback_url: 'https://n8n.example/webhook' },
			]);

			const exists = await node.webhookMethods.default.checkExists.call(hookFunctions);

			expect(exists).toBe(true);
			expect(staticData.webhookId).toBe(123);
		});
	});

	describe('create', () => {
		it('should register the subscription with the node id as verify token', async () => {
			const hookFunctions = mockDeep<IHookFunctions>();
			hookFunctions.getNode.mockReturnValue(mock({ id: nodeId }));
			hookFunctions.getNodeWebhookUrl.mockReturnValue('https://n8n.example/webhook');
			hookFunctions.getWorkflowStaticData.mockReturnValue({});
			const request = vi.spyOn(GenericFunctions, 'stravaApiRequest').mockResolvedValue({ id: 123 });

			await node.webhookMethods.default.create.call(hookFunctions);

			expect(request).toHaveBeenCalledWith('POST', '/push_subscriptions', {
				callback_url: 'https://n8n.example/webhook',
				verify_token: nodeId,
			});
		});
	});

	describe('create with an existing subscription', () => {
		it('should replace it with the node id as verify token when deleteIfExist is set', async () => {
			const hookFunctions = mockDeep<IHookFunctions>();
			hookFunctions.getNode.mockReturnValue(mock({ id: nodeId }));
			hookFunctions.getNodeWebhookUrl.mockReturnValue('https://n8n.example/webhook');
			hookFunctions.getWorkflowStaticData.mockReturnValue({});
			hookFunctions.getNodeParameter.mockReturnValue({ deleteIfExist: true });
			const request = vi
				.spyOn(GenericFunctions, 'stravaApiRequest')
				.mockRejectedValueOnce({
					cause: { error: { errors: [{ resource: 'PushSubscription', code: 'already exists' }] } },
				})
				.mockResolvedValueOnce([{ id: 1, callback_url: 'https://other.example/webhook' }])
				.mockResolvedValueOnce({})
				.mockResolvedValueOnce({ id: 123 });

			const created = await node.webhookMethods.default.create.call(hookFunctions);

			expect(created).toBe(true);
			expect(request).toHaveBeenCalledWith('DELETE', '/push_subscriptions/1');
			expect(request).toHaveBeenLastCalledWith('POST', '/push_subscriptions', {
				callback_url: 'https://n8n.example/webhook',
				verify_token: nodeId,
			});
		});
	});

	describe('webhook', () => {
		const setup = ({
			webhookName = 'default',
			query = {},
			body = {},
		}: {
			webhookName?: string;
			query?: Record<string, string>;
			body?: IDataObject;
		}) => {
			const webhookFunctions = mockDeep<IWebhookFunctions>();
			const res = mock<express.Response>();
			res.status.mockReturnValue(res);
			res.json.mockReturnValue(res);
			webhookFunctions.getNode.mockReturnValue(mock({ id: nodeId }));
			webhookFunctions.getWebhookName.mockReturnValue(webhookName);
			webhookFunctions.getQueryData.mockReturnValue(query);
			webhookFunctions.getBodyData.mockReturnValue(body);
			webhookFunctions.getResponseObject.mockReturnValue(res);
			webhookFunctions.getWorkflowStaticData.mockReturnValue({ webhookId: 123 });
			webhookFunctions.getNodeParameter.mockImplementation((name: string) =>
				name === 'resolveData' ? false : '*',
			);
			webhookFunctions.helpers.returnJsonArray.mockImplementation((data) => [
				{ json: data as never },
			]);
			return { webhookFunctions, res };
		};

		it('should echo the challenge when the verify token matches', async () => {
			const { webhookFunctions, res } = setup({
				webhookName: 'setup',
				query: { 'hub.challenge': 'abc', 'hub.verify_token': nodeId },
			});

			const result = await node.webhook.call(webhookFunctions);

			expect(res.json).toHaveBeenCalledWith({ 'hub.challenge': 'abc' });
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('should not echo the challenge when the verify token does not match', async () => {
			const { webhookFunctions, res } = setup({
				webhookName: 'setup',
				query: { 'hub.challenge': 'abc', 'hub.verify_token': 'other' },
			});

			const result = await node.webhook.call(webhookFunctions);

			expect(res.json).not.toHaveBeenCalled();
			expect(result).toEqual({});
		});

		it.each([123, '123'])(
			'should start the workflow for events of the registered subscription %j',
			async (webhookId) => {
				const body = { object_type: 'activity', aspect_type: 'create', subscription_id: 123 };
				const { webhookFunctions } = setup({ body });
				webhookFunctions.getWorkflowStaticData.mockReturnValue({ webhookId });

				const result = await node.webhook.call(webhookFunctions);

				expect(result).toEqual({ workflowData: [[{ json: body }]] });
			},
		);

		it('should ignore events of a different subscription', async () => {
			const { webhookFunctions } = setup({
				body: { object_type: 'activity', aspect_type: 'create', subscription_id: 999 },
			});

			const result = await node.webhook.call(webhookFunctions);

			expect(result).toEqual({});
		});

		it('should ignore events when no subscription id is stored', async () => {
			const { webhookFunctions } = setup({
				body: { object_type: 'activity', aspect_type: 'create', subscription_id: 'undefined' },
			});
			webhookFunctions.getWorkflowStaticData.mockReturnValue({});

			const result = await node.webhook.call(webhookFunctions);

			expect(result).toEqual({});
		});

		it('should ignore events without a subscription id', async () => {
			const { webhookFunctions } = setup({
				body: { object_type: 'activity', aspect_type: 'create' },
			});

			const result = await node.webhook.call(webhookFunctions);

			expect(result).toEqual({});
		});
	});
});
