import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import type { IWebhookFunctions, N8nOAuth2ValidationResult } from '../src/interfaces';
import { n8nOAuth2Auth } from '../src/n8n-oauth2-auth';

const WEBHOOK_URL = 'https://n8n.example.com/webhook/protected-path';

const buildContext = (opts: {
	authorization?: string;
	validation?: N8nOAuth2ValidationResult;
	webhookUrl?: string | undefined;
}) => {
	const response = mock<Response>();
	response.writeHead.mockReturnValue(response);
	response.end.mockReturnValue(response);
	response.status.mockReturnValue(response);
	response.send.mockReturnValue(response);

	const context = mock<IWebhookFunctions>();
	context.getWebhookResourceUrl.mockReturnValue(
		'webhookUrl' in opts ? opts.webhookUrl : WEBHOOK_URL,
	);
	context.getResponseObject.mockReturnValue(response);
	context.getRequestObject.mockReturnValue({
		headers: opts.authorization ? { authorization: opts.authorization } : {},
	} as never);
	context.validateN8nOAuth2Token.mockResolvedValue(
		opts.validation ?? { valid: true, user: { id: 'u1' } as never },
	);

	return { context, response, validateN8nOAuth2Token: context.validateN8nOAuth2Token };
};

describe('n8nOAuth2Auth', () => {
	it('returns the token and resource for a valid bearer token', async () => {
		const { context, validateN8nOAuth2Token } = buildContext({
			authorization: 'Bearer good-token',
			validation: { valid: true, user: { id: 'u1' } as never },
		});

		const result = await n8nOAuth2Auth(context, { realm: 'n8n Webhook' });

		expect(validateN8nOAuth2Token).toHaveBeenCalledWith('good-token', WEBHOOK_URL);
		expect(result).toEqual({ status: 'ok', token: 'good-token', resource: WEBHOOK_URL });
	});

	it('encodes the served method into the resource and the protected-resource metadata URL', async () => {
		const { context, validateN8nOAuth2Token } = buildContext({
			authorization: 'Bearer good-token',
		});

		// mixed-case input is canonicalised to the upper-cased `method` selector
		const result = await n8nOAuth2Auth(context, { realm: 'n8n Webhook', method: 'post' });

		const expectedResource = `${WEBHOOK_URL}?method=POST`;
		expect(validateN8nOAuth2Token).toHaveBeenCalledWith('good-token', expectedResource);
		expect(result).toEqual({ status: 'ok', token: 'good-token', resource: expectedResource });
	});

	it('advertises the method-qualified metadata URL in WWW-Authenticate', async () => {
		const { context, response } = buildContext({});

		await n8nOAuth2Auth(context, { realm: 'n8n Webhook', method: 'GET' });

		expect(response.writeHead).toHaveBeenCalledWith(401, {
			'WWW-Authenticate': expect.stringContaining(
				'/.well-known/oauth-protected-resource/webhook/protected-path?method=GET',
			),
		});
	});

	it('responds 401 without WWW-Authenticate error when no bearer token is present', async () => {
		const { context, response, validateN8nOAuth2Token } = buildContext({});

		const result = await n8nOAuth2Auth(context, { realm: 'n8n Webhook' });

		expect(result).toBe('handled');
		expect(validateN8nOAuth2Token).not.toHaveBeenCalled();
		expect(response.writeHead).toHaveBeenCalledWith(401, {
			'WWW-Authenticate': expect.stringContaining('realm="n8n Webhook"'),
		});
	});

	// insufficient_scope → 403, invalid_token → 401; both carry the reason in WWW-Authenticate.
	it.each([
		['insufficient_scope', 403],
		['invalid_token', 401],
	] as const)('maps a %s validation failure to a %i response', async (reason, code) => {
		const { context, response } = buildContext({
			authorization: 'Bearer test-token',
			validation: { valid: false, reason },
		});

		const result = await n8nOAuth2Auth(context, { realm: 'n8n MCP Server' });

		expect(result).toBe('handled');
		expect(response.writeHead).toHaveBeenCalledWith(code, {
			'WWW-Authenticate': expect.stringContaining(`error="${reason}"`),
		});
	});

	it('responds 503 when the token verifier is unavailable', async () => {
		const { context, response } = buildContext({
			authorization: 'Bearer test-token',
			validation: { valid: false, reason: 'verifier_unavailable' },
		});

		const result = await n8nOAuth2Auth(context, { realm: 'n8n Webhook' });

		expect(result).toBe('handled');
		expect(response.status).toHaveBeenCalledWith(503);
		expect(response.send).toHaveBeenCalledWith('OAuth token validation is not available');
	});

	it('throws when the webhook URL is unavailable', async () => {
		const { context } = buildContext({ webhookUrl: undefined });

		await expect(n8nOAuth2Auth(context, { realm: 'n8n Webhook' })).rejects.toThrow(
			'Webhook URL is not available',
		);
	});
});
