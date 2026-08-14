import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import type { Mock, Mocked } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import { SERVICE_PRINCIPAL_AUTH } from '../helpers/constants';
import { microsoftApiRequest, microsoftApiRequestAllItems } from '../transport';

describe('Microsoft Excel (SharePoint) Transport', () => {
	let ctx: Mocked<IExecuteFunctions>;
	let mockHttpRequestWithAuthentication: Mock;

	const setParams = (params: Record<string, unknown>) => {
		ctx.getNodeParameter.mockImplementation(
			(name: string, _itemIndex?: number, fallback?: unknown) =>
				(name in params ? params[name] : fallback) as never,
		);
	};

	beforeEach(() => {
		vi.clearAllMocks();
		ctx = mockDeep<IExecuteFunctions>();
		mockHttpRequestWithAuthentication = vi.fn().mockResolvedValue({ values: [] });
		ctx.helpers.httpRequestWithAuthentication = mockHttpRequestWithAuthentication;
		ctx.getNode.mockReturnValue({
			id: 'test-node',
			name: 'Test Node',
			type: 'n8n-nodes-base.microsoftExcelSharePoint',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		} as INode);
		setParams({ authentication: 'microsoftOAuth2Api' });
		ctx.getCredentials.mockResolvedValue({ graphApiBaseUrl: 'https://graph.microsoft.com' });
	});

	it.each([
		['US Government', 'https://graph.microsoft.us'],
		['US Government DOD', 'https://dod-graph.microsoft.us'],
		['China', 'https://microsoftgraph.chinacloudapi.cn'],
		['Global', 'https://graph.microsoft.com'],
	])('targets the %s cloud from the credential', async (_name, baseUrl) => {
		ctx.getCredentials.mockResolvedValue({ graphApiBaseUrl: baseUrl });

		await microsoftApiRequest.call(ctx, 'GET', '/v1.0/sites/s/drives/d/items/i');

		expect(mockHttpRequestWithAuthentication).toHaveBeenCalledWith(
			'microsoftOAuth2Api',
			expect.objectContaining({ url: `${baseUrl}/v1.0/sites/s/drives/d/items/i` }),
		);
	});

	it('falls back to the global cloud when the credential does not say', async () => {
		ctx.getCredentials.mockResolvedValue({});

		await microsoftApiRequest.call(ctx, 'GET', '/v1.0/sites/s');

		expect(mockHttpRequestWithAuthentication).toHaveBeenCalledWith(
			'microsoftOAuth2Api',
			expect.objectContaining({ url: 'https://graph.microsoft.com/v1.0/sites/s' }),
		);
	});

	it('sends Service Principal requests with its own credential type', async () => {
		setParams({ authentication: SERVICE_PRINCIPAL_AUTH });

		await microsoftApiRequest.call(ctx, 'GET', '/v1.0/sites/s');

		expect(ctx.getCredentials).toHaveBeenCalledWith(SERVICE_PRINCIPAL_AUTH);
		expect(mockHttpRequestWithAuthentication).toHaveBeenCalledWith(
			SERVICE_PRINCIPAL_AUTH,
			expect.anything(),
		);
	});

	it('uses an explicit uri verbatim', async () => {
		const nextLink = 'https://graph.microsoft.com/v1.0/sites?$skiptoken=abc';

		await microsoftApiRequest.call(ctx, 'GET', '/ignored', {}, {}, nextLink);

		expect(mockHttpRequestWithAuthentication).toHaveBeenCalledWith(
			'microsoftOAuth2Api',
			expect.objectContaining({ url: nextLink }),
		);
	});

	it('names the missing delegated permission on a refusal', async () => {
		setParams({
			authentication: 'microsoftOAuth2Api',
			resource: 'worksheet',
			operation: 'readRows',
		});
		mockHttpRequestWithAuthentication.mockRejectedValue({
			statusCode: 403,
			error: { error: { code: 'accessDenied', message: 'Access denied' } },
		});

		await expect(microsoftApiRequest.call(ctx, 'GET', '/v1.0/sites/s')).rejects.toThrow(
			/Sites\.Read\.All/,
		);
	});

	it('names the missing application permission on a refusal under the Service Principal', async () => {
		setParams({
			authentication: SERVICE_PRINCIPAL_AUTH,
			resource: 'worksheet',
			operation: 'readRows',
		});
		mockHttpRequestWithAuthentication.mockRejectedValue({ httpCode: '403' });

		await expect(microsoftApiRequest.call(ctx, 'GET', '/v1.0/sites/s')).rejects.toThrow(
			/Sites\.Read\.All \(or Sites\.Selected/,
		);
	});

	it('reports a plain not-found under the Service Principal without blaming one field', async () => {
		setParams({
			authentication: SERVICE_PRINCIPAL_AUTH,
			resource: 'worksheet',
			operation: 'readRows',
		});
		mockHttpRequestWithAuthentication.mockRejectedValue({ httpCode: '404' });

		await expect(microsoftApiRequest.call(ctx, 'GET', '/v1.0/sites/s')).rejects.toThrow(
			'The requested resource was not found. Check the Site, Library, Workbook, and Sheet values.',
		);
	});

	it('reports a network failure as unreachable, not as a rejection', async () => {
		setParams({ authentication: SERVICE_PRINCIPAL_AUTH });
		mockHttpRequestWithAuthentication.mockRejectedValue(new Error('getaddrinfo ENOTFOUND'));

		await expect(microsoftApiRequest.call(ctx, 'GET', '/v1.0/sites/s')).rejects.toThrow(
			'Could not reach Microsoft Graph. Check your network connection and try again.',
		);
	});

	it('keeps a fixed message for other Service Principal errors', async () => {
		setParams({
			authentication: SERVICE_PRINCIPAL_AUTH,
			resource: 'worksheet',
			operation: 'readRows',
		});
		mockHttpRequestWithAuthentication.mockRejectedValue({
			httpCode: '500',
			message: 'MARKER-do-not-leak',
			error: { error: { message: 'MARKER-do-not-leak' } },
		});

		let thrown: NodeApiError | undefined;
		try {
			await microsoftApiRequest.call(ctx, 'GET', '/v1.0/sites/s');
		} catch (error) {
			thrown = error as NodeApiError;
		}

		expect(thrown).toBeInstanceOf(NodeApiError);
		expect(thrown?.message).not.toContain('MARKER-do-not-leak');
	});

	describe('microsoftApiRequestAllItems', () => {
		it('returns every item from a single page', async () => {
			mockHttpRequestWithAuthentication.mockResolvedValue({ value: ['a', 'b'] });

			const result = await microsoftApiRequestAllItems.call(ctx, '/v1.0/sites/s/workbook/tables', {
				$select: 'id,name',
			});

			expect(result).toEqual(['a', 'b']);
			expect(mockHttpRequestWithAuthentication).toHaveBeenCalledTimes(1);
			expect(mockHttpRequestWithAuthentication).toHaveBeenCalledWith(
				'microsoftOAuth2Api',
				expect.objectContaining({
					url: 'https://graph.microsoft.com/v1.0/sites/s/workbook/tables',
					qs: { $select: 'id,name', $top: 100 },
				}),
			);
		});

		it('accumulates every page, following @odata.nextLink verbatim on later pages', async () => {
			const nextLink = 'https://graph.microsoft.com/v1.0/sites/s/workbook/tables?$skiptoken=abc';
			mockHttpRequestWithAuthentication
				.mockResolvedValueOnce({ value: ['a'], '@odata.nextLink': nextLink })
				.mockResolvedValueOnce({ value: ['b'] });

			const result = await microsoftApiRequestAllItems.call(ctx, '/v1.0/sites/s/workbook/tables');

			expect(result).toEqual(['a', 'b']);
			expect(mockHttpRequestWithAuthentication).toHaveBeenCalledTimes(2);
			expect(mockHttpRequestWithAuthentication).toHaveBeenNthCalledWith(
				1,
				'microsoftOAuth2Api',
				expect.objectContaining({
					url: 'https://graph.microsoft.com/v1.0/sites/s/workbook/tables',
					qs: { $top: 100 },
				}),
			);
			// The 2nd page is requested via the exact nextLink, with no rebuilt query params
			expect(mockHttpRequestWithAuthentication).toHaveBeenNthCalledWith(
				2,
				'microsoftOAuth2Api',
				expect.objectContaining({ url: nextLink, qs: {} }),
			);
		});
	});
});
