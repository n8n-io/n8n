import type { Request, Response } from 'express';
import { getHtmlSandboxCSP, isWebhookHtmlSandboxingDisabled } from 'n8n-core';
import type { IUser, IWebhookFunctions } from 'n8n-workflow';
import { n8nOAuth2Auth } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { Webpage } from '../Webpage.node';

vi.mock('n8n-core', () => ({
	getHtmlSandboxCSP: vi.fn(() => 'sandbox allow-scripts'),
	isWebhookHtmlSandboxingDisabled: vi.fn(() => false),
}));

vi.mock('n8n-workflow', async (importOriginal) => ({
	...(await importOriginal<typeof import('n8n-workflow')>()),
	n8nOAuth2Auth: vi.fn(),
}));

const HTML = '<!DOCTYPE html><html><body><h1>Hi</h1></body></html>';

describe('Webpage Node', () => {
	const node = new Webpage();
	let context: ReturnType<typeof mock<IWebhookFunctions>>;
	let req: ReturnType<typeof mock<Request>>;
	let res: ReturnType<typeof mock<Response>>;

	const setParameters = (parameters: { authentication?: string; html?: string }) => {
		context.getNodeParameter.mockImplementation((name: string, fallback?: string) => {
			if (name === 'authentication') return parameters.authentication ?? fallback;
			if (name === 'html') return parameters.html ?? fallback;
			return fallback;
		});
	};

	beforeEach(() => {
		vi.clearAllMocks();
		context = mock<IWebhookFunctions>();
		req = mock<Request>();
		res = mock<Response>();
		req.method = 'GET';
		res.status.mockReturnValue(res);
		context.getRequestObject.mockReturnValue(req);
		context.getResponseObject.mockReturnValue(res);
		vi.mocked(isWebhookHtmlSandboxingDisabled).mockReturnValue(false);
		setParameters({ authentication: 'none', html: HTML });
	});

	describe('description', () => {
		it('should declare one GET webhook at the custom path', () => {
			expect(node.description.webhooks).toEqual([
				expect.objectContaining({
					name: 'default',
					httpMethod: 'GET',
					isFullPath: true,
					path: '={{ $parameter["path"] || $webhookId }}',
				}),
			]);
		});

		it('should disallow expressions on the authentication selector and the HTML', () => {
			const properties = node.description.properties;
			const authentication = properties.find((property) => property.name === 'authentication');
			const html = properties.find((property) => property.name === 'html');

			expect(authentication).toMatchObject({ default: 'none', noDataExpression: true });
			expect(authentication?.options).toContainEqual(
				expect.objectContaining({ value: 'n8nOAuth2' }),
			);
			expect(html).toMatchObject({ noDataExpression: true });
		});
	});

	describe('webhook', () => {
		it('should serve the HTML with an HTML content type and the sandbox CSP', async () => {
			await node.webhook.call(context);

			expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html; charset=utf-8');
			expect(res.setHeader).toHaveBeenCalledWith('Content-Security-Policy', getHtmlSandboxCSP());
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.send).toHaveBeenCalledWith(HTML);
		});

		it('should not set the CSP when HTML sandboxing is disabled', async () => {
			vi.mocked(isWebhookHtmlSandboxingDisabled).mockReturnValue(true);

			await node.webhook.call(context);

			expect(res.setHeader).not.toHaveBeenCalledWith('Content-Security-Policy', expect.anything());
			expect(res.send).toHaveBeenCalledWith(HTML);
		});

		it('should not call the n8n OAuth helper when authentication is none', async () => {
			await node.webhook.call(context);

			expect(n8nOAuth2Auth).not.toHaveBeenCalled();
		});

		it('should send no page when the n8n OAuth helper handled the request', async () => {
			setParameters({ authentication: 'n8nOAuth2', html: HTML });
			vi.mocked(n8nOAuth2Auth).mockResolvedValue('handled');

			const result = await node.webhook.call(context);

			expect(n8nOAuth2Auth).toHaveBeenCalledWith(context, {
				realm: 'n8n Webpage',
				method: 'GET',
				browserFlow: 'auto',
			});
			expect(res.setHeader).not.toHaveBeenCalled();
			expect(res.send).not.toHaveBeenCalled();
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('should serve the page to an authorised n8n user without establishing an identity', async () => {
			setParameters({ authentication: 'n8nOAuth2', html: HTML });
			vi.mocked(n8nOAuth2Auth).mockResolvedValue({
				status: 'ok',
				token: 'token',
				resource: 'https://n8n.test/webhook/my-page?method=GET',
				user: mock<IUser>(),
			});

			await node.webhook.call(context);

			expect(res.send).toHaveBeenCalledWith(HTML);
			expect(context.establishTriggerIdentity).not.toHaveBeenCalled();
		});

		it('should return no workflow data, so no execution starts', async () => {
			const result = await node.webhook.call(context);

			expect(result).toEqual({ noWebhookResponse: true });
			expect(result.workflowData).toBeUndefined();
		});
	});
});
