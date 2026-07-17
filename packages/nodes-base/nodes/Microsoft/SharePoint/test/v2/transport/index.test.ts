import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import type { Mock, Mocked } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import {
	getSharePointCredentialType,
	microsoftApiRequest,
	SERVICE_PRINCIPAL_AUTH,
} from '../../../v2/transport';

describe('Microsoft SharePoint v2 Transport', () => {
	let ctx: Mocked<IExecuteFunctions>;
	let mockNode: INode;
	let mockRequestOAuth2: Mock;
	let mockRequestWithAuthentication: Mock;

	const setParams = (params: Record<string, unknown>) => {
		ctx.getNodeParameter.mockImplementation(
			(name: string, _itemIndex?: number, fallback?: unknown) =>
				(name in params ? params[name] : fallback) as never,
		);
	};

	beforeEach(() => {
		vi.clearAllMocks();
		ctx = mockDeep<IExecuteFunctions>();
		mockRequestOAuth2 = vi.fn().mockResolvedValue({ value: [] });
		mockRequestWithAuthentication = vi.fn().mockResolvedValue({ value: [] });
		ctx.helpers.requestOAuth2 = mockRequestOAuth2;
		ctx.helpers.requestWithAuthentication = mockRequestWithAuthentication;

		mockNode = {
			id: 'test-node',
			name: 'Test SharePoint Node',
			type: 'n8n-nodes-base.microsoftSharePoint',
			typeVersion: 2,
			position: [0, 0],
			parameters: {},
		};
		ctx.getNode.mockReturnValue(mockNode);
		setParams({ authentication: 'microsoftOAuth2Api' });
		ctx.getCredentials.mockResolvedValue({ graphApiBaseUrl: 'https://graph.microsoft.com' });
	});

	describe('getSharePointCredentialType', () => {
		it('should default to microsoftOAuth2Api when authentication is unset (load-options fallback 0)', () => {
			setParams({});
			expect(getSharePointCredentialType.call(ctx)).toBe('microsoftOAuth2Api');
		});

		it('should return the Service Principal type when selected', () => {
			setParams({ authentication: SERVICE_PRINCIPAL_AUTH });
			expect(getSharePointCredentialType.call(ctx)).toBe(SERVICE_PRINCIPAL_AUTH);
		});
	});

	describe('graphApiBaseUrl from credentials', () => {
		it.each([
			['US Government', 'https://graph.microsoft.us'],
			['US Government DOD', 'https://dod-graph.microsoft.us'],
			['China', 'https://microsoftgraph.chinacloudapi.cn'],
			['Global', 'https://graph.microsoft.com'],
		])('should target the %s cloud', async (_name, baseUrl) => {
			ctx.getCredentials.mockResolvedValue({ graphApiBaseUrl: baseUrl });

			await microsoftApiRequest.call(ctx, 'GET', '/v1.0/sites/s/lists/l');

			expect(mockRequestOAuth2).toHaveBeenCalledWith(
				'microsoftOAuth2Api',
				expect.objectContaining({ uri: `${baseUrl}/v1.0/sites/s/lists/l` }),
			);
		});

		it('should fall back to the global cloud when graphApiBaseUrl is empty', async () => {
			ctx.getCredentials.mockResolvedValue({ graphApiBaseUrl: '' });

			await microsoftApiRequest.call(ctx, 'GET', '/v1.0/sites/s/lists/l');

			expect(mockRequestOAuth2).toHaveBeenCalledWith(
				'microsoftOAuth2Api',
				expect.objectContaining({ uri: 'https://graph.microsoft.com/v1.0/sites/s/lists/l' }),
			);
		});

		it('should fall back to the global cloud when graphApiBaseUrl is undefined', async () => {
			ctx.getCredentials.mockResolvedValue({});

			await microsoftApiRequest.call(ctx, 'GET', '/v1.0/sites/s/lists/l');

			expect(mockRequestOAuth2).toHaveBeenCalledWith(
				'microsoftOAuth2Api',
				expect.objectContaining({ uri: 'https://graph.microsoft.com/v1.0/sites/s/lists/l' }),
			);
		});

		it('should strip trailing slashes from the base URL', async () => {
			ctx.getCredentials.mockResolvedValue({ graphApiBaseUrl: 'https://graph.microsoft.us//' });

			await microsoftApiRequest.call(ctx, 'GET', '/v1.0/sites/s/lists/l');

			expect(mockRequestOAuth2).toHaveBeenCalledWith(
				'microsoftOAuth2Api',
				expect.objectContaining({ uri: 'https://graph.microsoft.us/v1.0/sites/s/lists/l' }),
			);
		});

		it('should honor a sovereign graphApiBaseUrl under the Service Principal', async () => {
			setParams({ authentication: SERVICE_PRINCIPAL_AUTH });
			ctx.getCredentials.mockResolvedValue({ graphApiBaseUrl: 'https://graph.microsoft.us' });

			await microsoftApiRequest.call(ctx, 'GET', '/v1.0/sites/s/lists/l');

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
				SERVICE_PRINCIPAL_AUTH,
				expect.objectContaining({ uri: 'https://graph.microsoft.us/v1.0/sites/s/lists/l' }),
			);
		});
	});

	describe('auth routing', () => {
		it('should route OAuth2 requests through requestOAuth2 with the generic credential', async () => {
			await microsoftApiRequest.call(ctx, 'GET', '/v1.0/sites/s/lists/l');

			expect(ctx.getCredentials).toHaveBeenCalledWith('microsoftOAuth2Api');
			expect(mockRequestOAuth2).toHaveBeenCalledTimes(1);
			expect(mockRequestWithAuthentication).not.toHaveBeenCalled();
		});

		it('should route Service Principal requests through requestWithAuthentication', async () => {
			setParams({ authentication: SERVICE_PRINCIPAL_AUTH });

			await microsoftApiRequest.call(ctx, 'GET', '/v1.0/sites/s/lists/l');

			expect(ctx.getCredentials).toHaveBeenCalledWith(SERVICE_PRINCIPAL_AUTH);
			expect(mockRequestWithAuthentication).toHaveBeenCalledTimes(1);
			expect(mockRequestOAuth2).not.toHaveBeenCalled();
		});

		it('should pass an explicit uri through verbatim', async () => {
			const nextLink = 'https://graph.microsoft.com/v1.0/sites?$skiptoken=abc';

			await microsoftApiRequest.call(ctx, 'GET', '/ignored', {}, {}, nextLink);

			expect(mockRequestOAuth2).toHaveBeenCalledWith(
				'microsoftOAuth2Api',
				expect.objectContaining({ uri: nextLink }),
			);
		});
	});

	describe('permission refusals', () => {
		it('should name the missing delegated permission on a 403 under OAuth2', async () => {
			setParams({ authentication: 'microsoftOAuth2Api', resource: 'list', operation: 'get' });
			mockRequestOAuth2.mockRejectedValue({
				statusCode: 403,
				error: { error: { code: 'accessDenied', message: 'Access denied' } },
			});

			await expect(microsoftApiRequest.call(ctx, 'GET', '/v1.0/sites/s/lists/l')).rejects.toThrow(
				/Sites\.Read\.All/,
			);
		});

		it('should name the missing application permission on a 403 under the Service Principal', async () => {
			setParams({ authentication: SERVICE_PRINCIPAL_AUTH, resource: 'list', operation: 'get' });
			mockRequestWithAuthentication.mockRejectedValue({ httpCode: '403' });

			await expect(microsoftApiRequest.call(ctx, 'GET', '/v1.0/sites/s/lists/l')).rejects.toThrow(
				/Sites\.Read\.All \(or Sites\.Selected/,
			);
		});

		it('should set httpCode "403" so callers can catch refusals', async () => {
			setParams({ authentication: 'microsoftOAuth2Api', resource: 'list', operation: 'get' });
			mockRequestOAuth2.mockRejectedValue({
				statusCode: 403,
				error: { error: { code: 'accessDenied', message: 'Access denied' } },
			});

			let thrown: NodeApiError | undefined;
			try {
				await microsoftApiRequest.call(ctx, 'GET', '/v1.0/sites/s/lists/l');
			} catch (error) {
				thrown = error as NodeApiError;
			}

			expect(thrown).toBeInstanceOf(NodeApiError);
			expect(thrown?.httpCode).toBe('403');
		});

		it('should rewrite a Graph NotFound to name the node resource under OAuth2', async () => {
			setParams({ authentication: 'microsoftOAuth2Api', resource: 'list', operation: 'get' });
			mockRequestOAuth2.mockRejectedValue({
				statusCode: 404,
				error: { error: { code: 'NotFound', message: 'Resource not found' } },
			});

			await expect(microsoftApiRequest.call(ctx, 'GET', '/v1.0/sites/s/lists/l')).rejects.toThrow(
				'List not found',
			);
		});

		it('should keep a static sanitized message for other Service Principal errors', async () => {
			setParams({ authentication: SERVICE_PRINCIPAL_AUTH, resource: 'list', operation: 'get' });
			mockRequestWithAuthentication.mockRejectedValue({
				httpCode: '500',
				message: 'MARKER-do-not-leak',
				error: { error: { message: 'MARKER-do-not-leak' } },
			});

			let thrown: NodeApiError | undefined;
			try {
				await microsoftApiRequest.call(ctx, 'GET', '/v1.0/sites/s/lists/l');
			} catch (error) {
				thrown = error as NodeApiError;
			}

			expect(thrown).toBeInstanceOf(NodeApiError);
			expect(thrown?.message).not.toContain('MARKER-do-not-leak');
			// Airtight, not just message-deep: the marker must not survive anywhere
			// in the serialized error (description, messages[], context)
			expect(JSON.stringify(thrown)).not.toContain('MARKER-do-not-leak');
			expect(thrown?.message).toBe(
				"Microsoft Graph rejected the request (HTTP 500). Check the operation's inputs and the app registration's permissions.",
			);
		});

		it('should pin httpCode "404" on the delegated not-found rewrite', async () => {
			// resolveSiteId keys on httpCode === '404' — this anchor must not drift
			setParams({ authentication: 'microsoftOAuth2Api', resource: 'list', operation: 'get' });
			mockRequestOAuth2.mockRejectedValue({
				statusCode: 404,
				error: { error: { code: 'NotFound', message: 'Resource not found' } },
			});

			let thrown: NodeApiError | undefined;
			try {
				await microsoftApiRequest.call(ctx, 'GET', '/v1.0/sites/s/lists/l');
			} catch (error) {
				thrown = error as NodeApiError;
			}

			expect(thrown).toBeInstanceOf(NodeApiError);
			expect(thrown?.httpCode).toBe('404');
			expect(thrown?.message).toBe('List not found');
		});

		it("should rewrite SharePoint's own not-found code (itemNotFound) too", async () => {
			// SharePoint Graph surfaces send itemNotFound/ItemNotFound rather than
			// the generic OData NotFound; the rewrite keys on code alone
			setParams({ authentication: 'microsoftOAuth2Api', resource: 'list', operation: 'get' });
			mockRequestOAuth2.mockRejectedValue({
				statusCode: 404,
				error: {
					error: { code: 'itemNotFound', message: 'The provided item does not exist.' },
				},
			});

			await expect(microsoftApiRequest.call(ctx, 'GET', '/v1.0/sites/s/lists/l')).rejects.toThrow(
				'List not found',
			);
		});
	});

	describe('same-origin guard', () => {
		it('refuses a uri override pointing at a different host', async () => {
			ctx.getCredentials.mockResolvedValue({ graphApiBaseUrl: 'https://graph.microsoft.us' });

			await expect(
				microsoftApiRequest.call(
					ctx,
					'GET',
					'',
					{},
					{},
					'https://graph.microsoft.com/v1.0/sites?$skiptoken=abc',
				),
			).rejects.toThrow('Refusing to send credentials to an unexpected host');
			expect(mockRequestOAuth2).not.toHaveBeenCalled();
		});

		it('allows a same-origin next-page link', async () => {
			ctx.getCredentials.mockResolvedValue({ graphApiBaseUrl: 'https://graph.microsoft.us' });
			const nextLink = 'https://graph.microsoft.us/v1.0/sites?$skiptoken=abc';

			await microsoftApiRequest.call(ctx, 'GET', '', {}, {}, nextLink);

			expect(mockRequestOAuth2).toHaveBeenCalledWith(
				'microsoftOAuth2Api',
				expect.objectContaining({ uri: nextLink }),
			);
		});
	});

	describe('load-options fallback', () => {
		it('should treat the literal fallback 0 as the default credential type', () => {
			// A real load-options call returns the fallback value itself — the
			// literal 0 — not undefined
			ctx.getNodeParameter.mockReturnValue(0 as never);
			expect(getSharePointCredentialType.call(ctx)).toBe('microsoftOAuth2Api');
		});
	});

	describe('binary bodies', () => {
		it('passes a Buffer body through raw, with the caller Content-Type winning', async () => {
			setParams({ authentication: 'microsoftOAuth2Api' });
			const payload = Buffer.from('binary-bytes');

			await microsoftApiRequest.call(
				ctx,
				'PUT',
				'/v1.0/sites/s/drive/items/f:/a.png:/content',
				payload,
				{},
				undefined,
				{ 'Content-Type': 'image/png' },
			);

			const options = mockRequestOAuth2.mock.calls[0][1];
			expect(options.body).toBe(payload);
			expect(options.headers['Content-Type']).toBe('image/png');
			// The JSON flag stays on: it only governs parsing the driveItem reply
			expect(options.json).toBe(true);
		});
	});
});
