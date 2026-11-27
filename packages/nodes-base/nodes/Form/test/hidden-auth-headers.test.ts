import type { Request, Response } from 'express';
import get from 'lodash/get';
import { mock } from 'vitest-mock-extended';
import {
	FORM_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	REDACTED,
	type IDataObject,
	type INode,
	type IWebhookFunctions,
	type NodeParameterValueType,
} from 'n8n-workflow';

import { generateBasicAuthToken } from '../../Webhook/utils';
import { FormTrigger } from '../FormTrigger.node';
import { getFormOutputHeaders, HIDE_CONSUMED_AUTH_HEADERS_VERSION } from '../utils/utils';

const RESOURCE_URL = 'https://n8n.test/form/abc';
const BASIC_AUTH = `Basic ${Buffer.from('admin:password').toString('base64')}`;
const NODE_ID = 'node-1';
const WEBHOOK_ID = 'webhook-1';
const CREDENTIALS = { user: 'admin', password: 'password' };
const USER = { id: 'user-1', email: 'a@b.c', firstName: 'A', lastName: 'B' };

type SetupOptions = {
	typeVersion?: number;
	authentication?: string;
	showHeaders?: boolean;
	headers?: Record<string, string>;
};

const setup = ({
	typeVersion = HIDE_CONSUMED_AUTH_HEADERS_VERSION,
	authentication = 'basicAuth',
	showHeaders = true,
	headers = { authorization: BASIC_AUTH, 'x-tenant-id': 'acme' },
}: SetupOptions = {}) => {
	const node = {
		id: NODE_ID,
		webhookId: WEBHOOK_ID,
		type: FORM_TRIGGER_NODE_TYPE,
		typeVersion,
		name: 'Form Trigger',
		parameters: {
			formTitle: 'Test Form',
			responseMode: 'onReceived',
			authentication,
			formFields: { values: [{ fieldLabel: 'Name', fieldType: 'text' }] },
			options: { showHeaders },
		},
	} as unknown as INode;

	const context = mock<IWebhookFunctions>({ nodeHelpers: mock(), logger: mock() });
	const res = mock<Response>();
	// A plain object, so the consumed-auth record behaves as it does on a real request.
	const req = {
		headers: { 'content-type': 'multipart/form-data', ...headers },
		method: 'POST',
		contentType: 'multipart/form-data',
		query: {},
		ips: [],
		ip: '127.0.0.1',
	} as unknown as Request;

	context.getNode.mockReturnValue(node);
	context.getNodeParameter.mockImplementation(
		(name: string, fallback?: unknown) =>
			(get(node.parameters, name) ?? fallback) as NodeParameterValueType,
	);
	context.getRequestObject.mockReturnValue(req);
	context.getResponseObject.mockReturnValue(res);
	context.getHeaderData.mockReturnValue(req.headers);
	context.getBodyData.mockReturnValue({ data: { 'field-0': 'John Doe' }, files: {} });
	context.getWorkflowSettings.mockReturnValue({});
	context.getMode.mockReturnValue('manual');
	context.getTimezone.mockReturnValue('UTC');
	context.getChildNodes.mockReturnValue([]);
	context.getCredentials.mockResolvedValue(CREDENTIALS);
	context.getWebhookResourceUrl.calledWith('default').mockReturnValue(RESOURCE_URL);
	context.checkTriggerCredentialStatus.mockResolvedValue(undefined);
	res.status.mockImplementation(() => res);

	return { context, req };
};

const outputJson = async (context: IWebhookFunctions) => {
	const nodeType = new FormTrigger().getNodeType(context.getNode().typeVersion);
	const result = await nodeType.webhook!.call(context);
	return result.workflowData?.[0][0].json as IDataObject | undefined;
};

describe('Form Trigger output headers and built-in authentication', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe(`version ${HIDE_CONSUMED_AUTH_HEADERS_VERSION} and later`, () => {
		it('should hide the header used by Basic Auth and keep the other headers', async () => {
			const { context } = setup();

			expect((await outputJson(context))?.headers).toEqual({
				'content-type': 'multipart/form-data',
				authorization: REDACTED,
				'x-tenant-id': 'acme',
			});
		});

		it('should hide the form token accepted in place of Basic Auth', async () => {
			const token = generateBasicAuthToken(
				{ id: NODE_ID, webhookId: WEBHOOK_ID } as INode,
				CREDENTIALS,
			);
			const { context } = setup({ headers: { 'x-auth-token': token as string } });

			expect((await outputJson(context))?.headers).toEqual({
				'content-type': 'multipart/form-data',
				'x-auth-token': REDACTED,
			});
		});

		it('should hide the token used by n8n User Auth and keep the user', async () => {
			const { context } = setup({
				authentication: 'n8nUserAuth',
				headers: { 'x-auth-token': 'oauth-token', 'x-tenant-id': 'acme' },
			});
			context.validateN8nOAuth2Token.mockResolvedValue({ valid: true, user: USER });

			const json = await outputJson(context);

			expect(context.validateN8nOAuth2Token).toHaveBeenCalledWith('oauth-token', RESOURCE_URL);
			expect(json?.headers).toEqual({
				'content-type': 'multipart/form-data',
				'x-auth-token': REDACTED,
				'x-tenant-id': 'acme',
			});
			expect(json?.user).toMatchObject({ id: USER.id });
		});

		it('should hide the cookies when a n8n User Auth submission carries the OAuth cookie', async () => {
			const { context } = setup({
				authentication: 'n8nUserAuth',
				headers: {
					'x-auth-token': 'oauth-token',
					cookie: 'n8n-form-oauth=oauth-token; theme=dark',
				},
			});
			context.validateN8nOAuth2Token.mockResolvedValue({ valid: true, user: USER });

			const headers = (await outputJson(context))?.headers;

			expect(headers).toEqual({
				'content-type': 'multipart/form-data',
				'x-auth-token': REDACTED,
				cookie: REDACTED,
			});
			expect(JSON.stringify(headers)).not.toContain('oauth-token');
		});

		it('should keep other cookies when a n8n User Auth submission has no OAuth cookie', async () => {
			const { context } = setup({
				authentication: 'n8nUserAuth',
				headers: { 'x-auth-token': 'oauth-token', cookie: 'theme=dark' },
			});
			context.validateN8nOAuth2Token.mockResolvedValue({ valid: true, user: USER });

			expect((await outputJson(context))?.headers).toEqual({
				'content-type': 'multipart/form-data',
				'x-auth-token': REDACTED,
				cookie: 'theme=dark',
			});
		});

		it('should not hide any header when authentication is none', async () => {
			const { context } = setup({
				authentication: 'none',
				headers: { authorization: 'Bearer callers-own-token' },
			});

			expect((await outputJson(context))?.headers).toEqual({
				'content-type': 'multipart/form-data',
				authorization: 'Bearer callers-own-token',
			});
		});

		it('should not output headers when "Show Headers" is off', async () => {
			const { context } = setup({ showHeaders: false });

			expect((await outputJson(context))?.headers).toBeUndefined();
		});

		it('should leave the request headers unchanged', async () => {
			const { context, req } = setup();

			await outputJson(context);

			expect(req.headers).toEqual({
				'content-type': 'multipart/form-data',
				authorization: BASIC_AUTH,
				'x-tenant-id': 'acme',
			});
		});
	});

	describe('earlier versions', () => {
		it('should output the raw header used by Basic Auth', async () => {
			const { context } = setup({ typeVersion: 2.7 });

			expect((await outputJson(context))?.headers).toEqual({
				'content-type': 'multipart/form-data',
				authorization: BASIC_AUTH,
				'x-tenant-id': 'acme',
			});
		});

		it('should output the raw token used by n8n User Auth', async () => {
			const { context } = setup({
				typeVersion: 2.7,
				authentication: 'n8nUserAuth',
				headers: { 'x-auth-token': 'oauth-token' },
			});
			context.validateN8nOAuth2Token.mockResolvedValue({ valid: true, user: USER });

			expect((await outputJson(context))?.headers).toEqual({
				'content-type': 'multipart/form-data',
				'x-auth-token': 'oauth-token',
			});
		});
	});

	describe('getFormOutputHeaders', () => {
		it('should output the raw headers for the Form node', async () => {
			const { context } = setup();
			await outputJson(context);
			context.getNode.mockReturnValue({
				type: FORM_NODE_TYPE,
				typeVersion: HIDE_CONSUMED_AUTH_HEADERS_VERSION,
				name: 'Form',
			} as unknown as INode);

			expect(getFormOutputHeaders(context)).toEqual({
				'content-type': 'multipart/form-data',
				authorization: BASIC_AUTH,
				'x-tenant-id': 'acme',
			});
		});
	});

	it('should make the new version the default', () => {
		expect(new FormTrigger().description.defaultVersion).toBe(HIDE_CONSUMED_AUTH_HEADERS_VERSION);
	});
});
