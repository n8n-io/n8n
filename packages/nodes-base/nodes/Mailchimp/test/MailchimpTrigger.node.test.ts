import { createHmac } from 'crypto';
import type { IDataObject, IHookFunctions, IWebhookFunctions } from 'n8n-workflow';

import { mailchimpApiRequest } from '../GenericFunctions';
import { MailchimpTrigger } from '../MailchimpTrigger.node';

vi.mock('../GenericFunctions', () => ({ mailchimpApiRequest: vi.fn() }));

describe('MailchimpTrigger', () => {
	const signingSecret = 'test-signing-secret';
	const rawBody = Buffer.from('type=subscribe&fired_at=2026-10-20+10%3A00%3A00&data%5Bid%5D=abc');
	const body = { type: 'subscribe', fired_at: '2026-10-20 10:00:00', data: { id: 'abc' } };

	const trigger = new MailchimpTrigger();

	function sign(timestamp: number, payload = rawBody, secret = signingSecret) {
		const hmac = createHmac('sha256', secret);
		hmac.update(`${timestamp}.`);
		hmac.update(payload);
		return `t=${timestamp},v1=${hmac.digest('hex')}`;
	}

	function createWebhookContext(
		webhookData: IDataObject,
		signatureHeader?: string,
		request: { rawBody?: Buffer } = { rawBody },
	) {
		const res = { status: vi.fn().mockReturnThis(), send: vi.fn().mockReturnThis(), end: vi.fn() };
		const ctx = {
			getWorkflowStaticData: vi.fn().mockReturnValue(webhookData),
			getWebhookName: vi.fn().mockReturnValue('default'),
			getRequestObject: vi.fn().mockReturnValue({
				body,
				rawBody: request.rawBody,
				header: vi.fn((name: string) =>
					name.toLowerCase() === 'x-mailchimp-signature' ? signatureHeader : undefined,
				),
			}),
			getResponseObject: vi.fn().mockReturnValue(res),
			helpers: { returnJsonArray: vi.fn((data: IDataObject) => [{ json: data }]) },
		} as unknown as IWebhookFunctions;
		return { ctx, res };
	}

	function createHookContext(webhookData: IDataObject) {
		return {
			getNodeWebhookUrl: vi.fn().mockReturnValue('https://example.com/webhook'),
			getNodeParameter: vi.fn((name: string) => {
				if (name === 'list') return 'list-id';
				if (name === 'events') return ['subscribe'];
				return ['user'];
			}),
			getWorkflowStaticData: vi.fn().mockReturnValue(webhookData),
		} as unknown as IHookFunctions;
	}

	describe('create', () => {
		it('should store the signing secret returned by Mailchimp', async () => {
			const webhookData: IDataObject = {};
			vi.mocked(mailchimpApiRequest).mockResolvedValue({
				id: 'webhook-id',
				signing_enabled: true,
				signing_secret: signingSecret,
			});

			await trigger.webhookMethods.default.create.call(createHookContext(webhookData));

			expect(webhookData.webhookSecret).toBe(signingSecret);
		});

		it('should clear a stored secret when Mailchimp returns none', async () => {
			const webhookData: IDataObject = { webhookSecret: 'previous-secret' };
			vi.mocked(mailchimpApiRequest).mockResolvedValue({ id: 'webhook-id' });

			await trigger.webhookMethods.default.create.call(createHookContext(webhookData));

			expect(webhookData).not.toHaveProperty('webhookSecret');
		});
	});

	describe('delete', () => {
		it('should remove the stored signing secret', async () => {
			const webhookData: IDataObject = { webhookId: 'webhook-id', webhookSecret: signingSecret };
			vi.mocked(mailchimpApiRequest).mockResolvedValue({});

			await trigger.webhookMethods.default.delete.call(createHookContext(webhookData));

			expect(webhookData).not.toHaveProperty('webhookSecret');
		});
	});

	describe('webhook', () => {
		const signedWebhookData = () => ({
			webhookId: 'webhook-id',
			events: ['subscribe'],
			sources: ['user'],
			webhookSecret: signingSecret,
		});

		it('should accept a request with a valid signature', async () => {
			const { ctx } = createWebhookContext(
				signedWebhookData(),
				sign(Math.floor(Date.now() / 1000)),
			);

			const result = await trigger.webhook.call(ctx);

			expect(result.workflowData).toEqual([[{ json: body }]]);
		});

		it.each([
			['an invalid signature', () => sign(Math.floor(Date.now() / 1000), rawBody, 'wrong-secret')],
			[
				'a signature for a different body',
				() => sign(Math.floor(Date.now() / 1000), Buffer.from('type=unsubscribe')),
			],
			['no signature header', () => undefined],
			['an expired timestamp', () => sign(Math.floor(Date.now() / 1000) - 600)],
		])('should reject a request with %s', async (_, getHeader) => {
			const { ctx, res } = createWebhookContext(signedWebhookData(), getHeader());

			const result = await trigger.webhook.call(ctx);

			expect(result).toEqual({ noWebhookResponse: true });
			expect(res.status).toHaveBeenCalledWith(401);
		});

		it('should reject a signed request without a raw body', async () => {
			const { ctx, res } = createWebhookContext(
				signedWebhookData(),
				sign(Math.floor(Date.now() / 1000)),
				{},
			);

			const result = await trigger.webhook.call(ctx);

			expect(result).toEqual({ noWebhookResponse: true });
			expect(res.status).toHaveBeenCalledWith(401);
		});

		it('should skip verification when no signing secret is stored', async () => {
			const { webhookSecret: _, ...unsignedWebhookData } = signedWebhookData();
			const { ctx } = createWebhookContext(unsignedWebhookData);

			const result = await trigger.webhook.call(ctx);

			expect(result.workflowData).toEqual([[{ json: body }]]);
		});
	});
});
