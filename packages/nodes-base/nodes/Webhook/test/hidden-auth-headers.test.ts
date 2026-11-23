import type { Request, Response } from 'express';
import { stat } from 'fs/promises';
import jwt from 'jsonwebtoken';
import { mock } from 'vitest-mock-extended';
import { REDACTED, type IDataObject, type IWebhookFunctions, type INode } from 'n8n-workflow';

import { Webhook } from '../Webhook.node';
import {
	generateBasicAuthToken,
	getOutputHeaders,
	HIDE_CONSUMED_AUTH_HEADERS_VERSION,
} from '../utils';

vi.mock('fs/promises');
vi.mock('fs', async (importOriginal) => ({
	...(await importOriginal<typeof import('fs')>()),
	createWriteStream: vi.fn(),
}));
vi.mock('stream/promises', () => ({ pipeline: vi.fn() }));
vi.mock('tmp-promise', () => ({
	file: vi.fn().mockResolvedValue({ path: '/tmp/n8n-webhook-test', cleanup: vi.fn() }),
}));

const WEBHOOK_URL = 'https://n8n.test/webhook/abc';
const BASIC_AUTH = `Basic ${Buffer.from('admin:password').toString('base64')}`;
const NODE_ID = 'node-1';
const WEBHOOK_ID = 'webhook-1';

type SetupOptions = {
	typeVersion?: number;
	authentication?: string;
	credentials?: IDataObject;
	headers?: Record<string, string>;
	options?: IDataObject;
	contentType?: string;
	body?: unknown;
	method?: string;
};

const setup = ({
	typeVersion = HIDE_CONSUMED_AUTH_HEADERS_VERSION,
	authentication = 'basicAuth',
	credentials = { user: 'admin', password: 'password' },
	headers = { authorization: BASIC_AUTH, 'x-tenant-id': 'acme' },
	options = {},
	contentType = 'application/json',
	body = { hello: 'world' },
	method = 'POST',
}: SetupOptions = {}) => {
	const context = mock<IWebhookFunctions>({ nodeHelpers: mock(), logger: mock() });
	const res = mock<Response>();
	// A plain object, so the consumed-auth record behaves as it does on a real request.
	const req = {
		headers,
		params: {},
		query: {},
		body,
		method,
		contentType,
		originalUrl: '/webhook/abc',
		ips: [],
		ip: '127.0.0.1',
	} as unknown as Request;

	context.getRequestObject.mockReturnValue(req);
	context.getResponseObject.mockReturnValue(res);
	context.getHeaderData.mockReturnValue(headers);
	context.getChildNodes.mockReturnValue([]);
	context.getNode.mockReturnValue({
		id: NODE_ID,
		webhookId: WEBHOOK_ID,
		type: 'n8n-nodes-base.webhook',
		typeVersion,
		name: 'Webhook',
		parameters: {},
	} as unknown as INode);
	context.getNodeParameter.mockImplementation((name: string) => {
		if (name === 'options') return options;
		if (name === 'responseMode') return 'onReceived';
		if (name === 'authentication') return authentication;
		if (name === 'httpMethod') return method;
		return undefined;
	});
	context.getCredentials.mockResolvedValue(credentials);
	context.getNodeWebhookUrl.calledWith('default').mockReturnValue(WEBHOOK_URL);
	context.getWebhookResourceUrl.calledWith('default').mockReturnValue(WEBHOOK_URL);
	res.writeHead.mockImplementation(() => res);
	res.end.mockImplementation(() => res);

	return { context, req };
};

const outputHeaders = async (context: IWebhookFunctions) => {
	const result = await new Webhook().webhook(context);
	return result.workflowData?.[0][0].json.headers;
};

describe('Webhook output headers and built-in authentication', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(stat).mockResolvedValue({ size: 0 } as Awaited<ReturnType<typeof stat>>);
	});

	describe(`version ${HIDE_CONSUMED_AUTH_HEADERS_VERSION} and later`, () => {
		it('should hide the header used by Basic Auth and keep the other headers', async () => {
			const { context } = setup();

			expect(await outputHeaders(context)).toEqual({
				authorization: REDACTED,
				'x-tenant-id': 'acme',
			});
		});

		it('should hide the header named in the Header Auth credential', async () => {
			const { context } = setup({
				authentication: 'headerAuth',
				credentials: { name: 'X-Api-Key', value: 'secret-value' },
				headers: { 'x-api-key': 'secret-value', authorization: 'Bearer callers-own-token' },
			});

			expect(await outputHeaders(context)).toEqual({
				'x-api-key': REDACTED,
				authorization: 'Bearer callers-own-token',
			});
		});

		it('should hide the header used by JWT Auth and keep the verified claims', async () => {
			const token = jwt.sign({ sub: 'caller-1' }, 'secret', { algorithm: 'HS256' });
			const { context } = setup({
				authentication: 'jwtAuth',
				credentials: { keyType: 'passphrase', publicKey: '', secret: 'secret', algorithm: 'HS256' },
				headers: { authorization: `Bearer ${token}`, 'x-tenant-id': 'acme' },
			});

			const result = await new Webhook().webhook(context);
			const json = result.workflowData?.[0][0].json;

			expect(json?.headers).toEqual({ authorization: REDACTED, 'x-tenant-id': 'acme' });
			expect(json?.jwtPayload).toMatchObject({ sub: 'caller-1' });
		});

		it('should hide the header used by n8n User Auth', async () => {
			const { context } = setup({
				authentication: 'n8nOAuth2',
				headers: { authorization: 'Bearer good-token', 'x-tenant-id': 'acme' },
				method: 'GET',
			});
			context.validateN8nOAuth2Token.mockResolvedValue({
				valid: true,
				user: { id: 'user-1', email: 'a@b.c', firstName: 'A', lastName: 'B' },
			});

			expect(await outputHeaders(context)).toEqual({
				authorization: REDACTED,
				'x-tenant-id': 'acme',
			});
		});

		it('should hide the remaining cookies after the n8n User Auth browser flow', async () => {
			const { context } = setup({
				authentication: 'n8nOAuth2',
				options: { oauthClient: 'browser' },
				headers: {
					cookie: 'n8n-webhook-oauth=good-token; theme=dark',
					'x-tenant-id': 'acme',
				},
				method: 'GET',
			});
			context.validateN8nOAuth2Token.mockResolvedValue({
				valid: true,
				user: { id: 'user-1', email: 'a@b.c', firstName: 'A', lastName: 'B' },
			});

			const headers = await outputHeaders(context);

			expect(context.validateN8nOAuth2Token).toHaveBeenCalledWith(
				'good-token',
				`${WEBHOOK_URL}?method=GET`,
			);
			expect(headers).toEqual({ cookie: REDACTED, 'x-tenant-id': 'acme' });
			expect(JSON.stringify(headers)).not.toContain('good-token');
		});

		it('should hide the form token accepted in place of Basic Auth', async () => {
			const credentials = { user: 'admin', password: 'password' };
			const token = generateBasicAuthToken(
				{ id: NODE_ID, webhookId: WEBHOOK_ID } as INode,
				credentials,
			);
			const { context } = setup({
				credentials,
				headers: { 'x-auth-token': token as string, 'x-tenant-id': 'acme' },
			});

			expect(await outputHeaders(context)).toEqual({
				'x-auth-token': REDACTED,
				'x-tenant-id': 'acme',
			});
		});

		it('should not hide any header when authentication is none', async () => {
			const { context } = setup({
				authentication: 'none',
				headers: { authorization: 'Bearer callers-own-token', 'x-tenant-id': 'acme' },
			});

			expect(await outputHeaders(context)).toEqual({
				authorization: 'Bearer callers-own-token',
				'x-tenant-id': 'acme',
			});
		});

		it('should hide the header in multipart form data output', async () => {
			const { context } = setup({
				contentType: 'multipart/form-data',
				body: { data: { field: 'value' }, files: {} },
			});

			expect(await outputHeaders(context)).toEqual({
				authorization: REDACTED,
				'x-tenant-id': 'acme',
			});
		});

		it('should hide the header in binary data output', async () => {
			const { context } = setup({ body: undefined, contentType: 'application/octet-stream' });

			expect(await outputHeaders(context)).toEqual({
				authorization: REDACTED,
				'x-tenant-id': 'acme',
			});
		});

		it('should hide the header in binary data output with the "binaryData" option', async () => {
			const { context } = setup({ options: { binaryData: true } });

			expect(await outputHeaders(context)).toEqual({
				authorization: REDACTED,
				'x-tenant-id': 'acme',
			});
		});

		it('should leave the request headers unchanged', async () => {
			const { context, req } = setup();

			await new Webhook().webhook(context);

			expect(req.headers).toEqual({ authorization: BASIC_AUTH, 'x-tenant-id': 'acme' });
		});
	});

	describe('earlier versions', () => {
		it.each([1, 1.1, 2, 2.1, 2.2])(
			'should output the raw headers on version %s',
			async (typeVersion) => {
				const { context } = setup({ typeVersion });

				expect(await outputHeaders(context)).toEqual({
					authorization: BASIC_AUTH,
					'x-tenant-id': 'acme',
				});
			},
		);
	});

	describe('getOutputHeaders', () => {
		it('should output the raw headers for nodes that reuse the Webhook code', async () => {
			const { context } = setup();
			await new Webhook().webhook(context);
			context.getNode.mockReturnValue({
				type: 'n8n-nodes-base.wait',
				typeVersion: HIDE_CONSUMED_AUTH_HEADERS_VERSION,
				name: 'Wait',
			} as unknown as INode);

			expect(getOutputHeaders(context)).toEqual({
				authorization: BASIC_AUTH,
				'x-tenant-id': 'acme',
			});
		});
	});

	it('should make the new version the default', () => {
		const { description } = new Webhook();

		expect(description.version).toContain(HIDE_CONSUMED_AUTH_HEADERS_VERSION);
		expect(description.defaultVersion).toBe(HIDE_CONSUMED_AUTH_HEADERS_VERSION);
	});
});
