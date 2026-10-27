import { createHmac } from 'crypto';
import type { IDataObject, IHookFunctions, IWebhookFunctions } from 'n8n-workflow';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { venafiApiRequest } from '../GenericFunctions';
import { VenafiTlsProtectCloudTrigger } from '../VenafiTlsProtectCloudTrigger.node';

vi.mock('../GenericFunctions', () => ({
	venafiApiRequest: vi.fn(),
}));

// Venafi pads its base64url, so convert from base64 instead of using Node's unpadded 'base64url'
function sign(body: string, secret: string, timestamp = '1793088623') {
	const digest = createHmac('sha256', secret).update(body).digest();
	return Buffer.concat([Buffer.from(`t:${timestamp},s:`), digest])
		.toString('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_');
}

describe('VenafiTlsProtectCloudTrigger', () => {
	const webhookUrl = 'https://example.com/webhook';
	const secret = 'a'.repeat(64);
	const event = {
		eventName: 'Certificate Request Created',
		message: 'Certificate Request cn=example.com created',
		eventType: 'Certificates',
		criticality: 0,
	};
	const body = JSON.stringify({ events: [event] });

	let trigger: VenafiTlsProtectCloudTrigger;
	let hookFunctions: ReturnType<typeof mock<IHookFunctions>>;
	let webhookFunctions: ReturnType<typeof mock<IWebhookFunctions>>;
	let webhookData: IDataObject;
	let headers: Record<string, string>;
	let res: { status: Mock; send: Mock; end: Mock };

	async function receive(rawBody: string) {
		webhookFunctions.getBodyData.mockReturnValue(JSON.parse(rawBody) as IDataObject);
		webhookFunctions.getRequestObject.mockReturnValue({
			rawBody: Buffer.from(rawBody),
			header: (name: string) => headers[name.toLowerCase()],
		} as never);
		return await trigger.webhook.call(webhookFunctions);
	}

	beforeEach(() => {
		vi.clearAllMocks();
		trigger = new VenafiTlsProtectCloudTrigger();
		hookFunctions = mock<IHookFunctions>();
		webhookFunctions = mock<IWebhookFunctions>();
		webhookData = {};
		headers = {};
		res = { status: vi.fn(), send: vi.fn(), end: vi.fn() };
		res.status.mockReturnValue(res);
		res.send.mockReturnValue(res);

		hookFunctions.getNodeWebhookUrl.mockReturnValue(webhookUrl);
		hookFunctions.getNodeParameter.mockReturnValue('Certificates');
		hookFunctions.getWorkflowStaticData.mockReturnValue(webhookData);
		webhookFunctions.getWorkflowStaticData.mockReturnValue(webhookData);
		webhookFunctions.getNodeParameter.mockReturnValue(['*']);
		webhookFunctions.getResponseObject.mockReturnValue(res as never);
		webhookFunctions.helpers = { returnJsonArray: vi.fn((data) => data) } as never;
	});

	describe('checkExists', () => {
		// The API does not return the connection, so `connection` is always null.
		const connector = (id: string, name: string, status = 'Active') => ({
			id,
			name,
			status,
			properties: { target: { type: 'generic', connection: null } },
		});

		it('should delete every connector for this webhook URL', async () => {
			(venafiApiRequest as Mock).mockResolvedValueOnce({
				connectors: [
					connector('other', 'Splunk alerts'),
					connector('ours', `n8n-webhook (${webhookUrl})`),
					connector('ours-disabled', `n8n-webhook (${webhookUrl})`, 'Disabled'),
					connector('other-url', `n8n-webhook (${webhookUrl}-test)`),
				],
			});

			const exists = await trigger.webhookMethods.default.checkExists.call(hookFunctions);

			expect(exists).toBe(false);
			expect(venafiApiRequest).toHaveBeenCalledWith('DELETE', '/v1/connectors/ours');
			expect(venafiApiRequest).toHaveBeenCalledWith('DELETE', '/v1/connectors/ours-disabled');
			expect(venafiApiRequest).not.toHaveBeenCalledWith('DELETE', '/v1/connectors/other');
			expect(venafiApiRequest).not.toHaveBeenCalledWith('DELETE', '/v1/connectors/other-url');
		});
	});

	describe('create', () => {
		it('should send a random secret with the connector and store it', async () => {
			(venafiApiRequest as Mock).mockResolvedValue({ id: 'connector-1' });

			await trigger.webhookMethods.default.create.call(hookFunctions);

			const requestBody = (venafiApiRequest as Mock).mock.calls[0][2];
			const connection = requestBody.properties.target.connection;
			expect(connection.url).toBe(webhookUrl);
			expect(connection.secret).toMatch(/^[0-9a-f]{64}$/);
			expect(webhookData).toEqual({ webhookId: 'connector-1', webhookSecret: connection.secret });
		});
	});

	describe('delete', () => {
		it('should remove the stored secret', async () => {
			webhookData.webhookId = 'connector-1';
			webhookData.webhookSecret = secret;
			(venafiApiRequest as Mock).mockResolvedValue({});

			await trigger.webhookMethods.default.delete.call(hookFunctions);

			expect(webhookData).toEqual({});
		});
	});

	describe('webhook', () => {
		beforeEach(() => {
			webhookData.webhookSecret = secret;
		});

		it('should start the workflow for a correctly signed event', async () => {
			headers['vaas-signature'] = sign(body, secret);

			const result = await receive(body);

			expect(result).toEqual({ workflowData: [[event]] });
		});

		it('should accept a retry that has a different timestamp', async () => {
			headers['vaas-signature'] = sign(body, secret, '1793088624');

			const result = await receive(body);

			expect(result).toEqual({ workflowData: [[event]] });
		});

		it.each([
			['signed with another secret', () => sign(body, 'b'.repeat(64))],
			['signed over another body', () => sign('{"events":[]}', secret)],
			[
				'without the t:,s: prefix',
				() => createHmac('sha256', secret).update(body).digest('base64url'),
			],
			['missing', () => undefined],
		])('should reply 401 when the signature is %s', async (_, signature) => {
			const value = signature();
			if (value) headers['vaas-signature'] = value;

			const result = await receive(body);

			expect(res.status).toHaveBeenCalledWith(401);
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('should answer the connection test before the secret is stored', async () => {
			delete webhookData.webhookSecret;
			headers['vaas-signature'] = sign(body, 'not-stored-yet');

			const result = await receive(
				JSON.stringify({ events: [{ message: 'TESTING CONNECTION...' }] }),
			);

			expect(res.status).toHaveBeenCalledWith(200);
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('should skip the check when no secret is stored', async () => {
			delete webhookData.webhookSecret;

			const result = await receive(body);

			expect(result).toEqual({ workflowData: [[event]] });
		});
	});
});
