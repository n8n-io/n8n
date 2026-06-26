import type { IHookFunctions } from 'n8n-workflow';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { GristTrigger } from '../GristTrigger.node';

describe('GristTrigger', () => {
	const webhookUrl = 'https://n8n.test/webhook/grist';

	const setup = (paramOverrides: Record<string, unknown> = {}) => {
		const staticData: { webhookId?: string } = {};
		const request = vi.fn();
		const requestOAuth2 = vi.fn();

		const hookFns = mock<IHookFunctions>();
		hookFns.helpers = { ...hookFns.helpers, request, requestOAuth2 };
		hookFns.getNodeWebhookUrl.mockReturnValue(webhookUrl);
		hookFns.getWorkflowStaticData.mockReturnValue(staticData);
		hookFns.getCredentials.mockResolvedValue({
			apiKey: 'key',
			selfHostedUrl: 'http://localhost:8484',
		});

		const params: Record<string, unknown> = {
			authentication: 'apiKey',
			docId: 'doc1',
			tableId: 'Table1',
			events: ['add', 'update'],
			'options.isReadyColumn': '',
			...paramOverrides,
		};
		(hookFns.getNodeParameter as unknown as Mock).mockImplementation(
			(name: string) => params[name],
		);

		return { hookFns, staticData, request, requestOAuth2 };
	};

	describe('checkExists', () => {
		it('returns false when no Grist webhook points at this URL', async () => {
			const { hookFns, staticData, request } = setup();
			request.mockResolvedValue({
				webhooks: [{ id: 'other', fields: { url: 'https://example.com/x' } }],
			});

			const exists = await new GristTrigger().webhookMethods.default.checkExists.call(hookFns);

			expect(exists).toBe(false);
			expect(staticData.webhookId).toBeUndefined();
		});

		it('returns true and stores the id when a matching webhook exists', async () => {
			const { hookFns, staticData, request } = setup();
			request.mockResolvedValue({
				webhooks: [{ id: 'wh_1', fields: { url: webhookUrl } }],
			});

			const exists = await new GristTrigger().webhookMethods.default.checkExists.call(hookFns);

			expect(exists).toBe(true);
			expect(staticData.webhookId).toBe('wh_1');
		});

		it('uses OAuth2 against api.getgrist.com for hosted Grist', async () => {
			const { hookFns, requestOAuth2 } = setup({ authentication: 'oAuth2' });
			hookFns.getCredentials.mockResolvedValue({ url: 'https://api.getgrist.com' });
			requestOAuth2.mockResolvedValue({ webhooks: [] });

			await new GristTrigger().webhookMethods.default.checkExists.call(hookFns);

			expect(requestOAuth2).toHaveBeenCalledWith(
				'gristOAuth2Api',
				expect.objectContaining({ uri: 'https://api.getgrist.com/api/docs/doc1/webhooks' }),
			);
		});
	});

	describe('create', () => {
		it('registers a webhook with the chosen events and stores the returned id', async () => {
			const { hookFns, staticData, request } = setup();
			request.mockResolvedValue({ webhooks: [{ id: 'wh_new' }] });

			const created = await new GristTrigger().webhookMethods.default.create.call(hookFns);

			expect(created).toBe(true);
			expect(staticData.webhookId).toBe('wh_new');

			const options = request.mock.calls[0][0];
			expect(options.method).toBe('POST');
			expect(options.uri).toBe('http://localhost:8484/api/docs/doc1/webhooks');
			expect(options.body).toEqual({
				webhooks: [
					{
						fields: {
							url: webhookUrl,
							eventTypes: ['add', 'update'],
							tableId: 'Table1',
							isReadyColumn: null,
						},
					},
				],
			});
		});

		it('passes the ready column through when set', async () => {
			const { hookFns, request } = setup({ 'options.isReadyColumn': 'IsReady' });
			request.mockResolvedValue({ webhooks: [{ id: 'wh_new' }] });

			await new GristTrigger().webhookMethods.default.create.call(hookFns);

			expect(request.mock.calls[0][0].body.webhooks[0].fields.isReadyColumn).toBe('IsReady');
		});
	});

	describe('delete', () => {
		it('deletes the registered webhook and clears static data', async () => {
			const { hookFns, staticData, request } = setup();
			staticData.webhookId = 'wh_1';
			request.mockResolvedValue({ success: true });

			const deleted = await new GristTrigger().webhookMethods.default.delete.call(hookFns);

			expect(deleted).toBe(true);
			expect(staticData.webhookId).toBeUndefined();

			const options = request.mock.calls[0][0];
			expect(options.method).toBe('DELETE');
			expect(options.uri).toBe('http://localhost:8484/api/docs/doc1/webhooks/wh_1');
		});

		it('is a no-op when nothing was registered', async () => {
			const { hookFns, request } = setup();
			const deleted = await new GristTrigger().webhookMethods.default.delete.call(hookFns);

			expect(deleted).toBe(true);
			expect(request).not.toHaveBeenCalled();
		});
	});
});
