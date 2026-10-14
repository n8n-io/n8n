import type { Request, Response } from 'express';
import type { IWebhookFunctions } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { Webhook } from '../Webhook.node';

describe('Webhook Ignore Bots without authentication', () => {
	const node = new Webhook();
	let context: ReturnType<typeof mock<IWebhookFunctions>>;
	let req: ReturnType<typeof mock<Request>>;
	let res: ReturnType<typeof mock<Response>>;
	let options: { ignoreBots: boolean };

	beforeEach(() => {
		options = { ignoreBots: true };
		context = mock<IWebhookFunctions>();
		req = mock<Request>({
			method: 'GET',
			headers: {},
			params: {},
			query: {},
			body: {},
		});
		res = mock<Response>();
		context.getRequestObject.mockReturnValue(req);
		context.getResponseObject.mockReturnValue(res);
		context.getChildNodes.mockReturnValue([]);
		context.getNode.mockReturnValue({
			id: 'webhook-1',
			name: 'Webhook',
			type: 'n8n-nodes-base.webhook',
			typeVersion: 2,
			position: [0, 0],
			parameters: { authentication: 'none', options },
		});
		context.getNodeParameter.mockImplementation((parameterName) => {
			if (parameterName === 'options') return options;
			if (parameterName === 'authentication') return 'none';
			if (parameterName === 'responseMode') return 'onReceived';
			if (parameterName === 'httpMethod') return 'GET';
			return undefined;
		});
		context.getNodeWebhookUrl
			.calledWith('default')
			.mockReturnValue('https://n8n.test/webhook/bots');
		context.getMode.mockReturnValue('webhook');
	});

	// NODE-5776: Bot rejection must explain the cause when authentication is disabled.
	it.each(['curl/8.0.1', 'Mozilla/5.0'])(
		'reports bot detection and Ignore Bots in the 403 response for "%s"',
		async (userAgent) => {
			req.headers['user-agent'] = userAgent;

			const result = await node.webhook(context);

			expect(res.writeHead).toHaveBeenCalledWith(403, expect.any(Object));
			expect(result).toEqual({ noWebhookResponse: true });
			expect(context.getCredentials).not.toHaveBeenCalled();
			expect(res.end).toHaveBeenCalledWith(expect.stringMatching(/bot/i));
			expect(res.end).toHaveBeenCalledWith(expect.stringContaining('Ignore Bots'));
		},
	);

	it('accepts a browser user agent when Ignore Bots is enabled', async () => {
		req.headers['user-agent'] =
			'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

		const result = await node.webhook(context);

		expect(result.workflowData?.[0][0].json.headers).toEqual(req.headers);
		expect(context.getCredentials).not.toHaveBeenCalled();
		expect(res.writeHead).not.toHaveBeenCalled();
		expect(res.end).not.toHaveBeenCalled();
	});

	it('accepts a bot user agent when Ignore Bots is disabled', async () => {
		options.ignoreBots = false;
		req.headers['user-agent'] = 'curl/8.0.1';

		const result = await node.webhook(context);

		expect(result.workflowData?.[0][0].json.headers).toEqual(req.headers);
		expect(context.getCredentials).not.toHaveBeenCalled();
		expect(res.writeHead).not.toHaveBeenCalled();
		expect(res.end).not.toHaveBeenCalled();
	});
});
