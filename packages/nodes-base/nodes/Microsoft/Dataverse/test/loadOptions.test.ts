// Fixtures and expected values below mirror Dataverse API responses (lowercase
// logical names, `{ name, value }` option shapes) — not node display-name params.
/* eslint-disable n8n-nodes-base/node-param-display-name-miscased */

import type { ILoadOptionsFunctions, INode, JsonObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { getColumns, getEntitySets, searchEntitySets, searchRows } from '../loadOptions';

const BASE_URL = 'https://org.crm.dynamics.com';

const node: INode = {
	id: 'test-node',
	name: 'Microsoft Dataverse',
	type: 'n8n-nodes-base.microsoftDataverse',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

describe('Microsoft Dataverse loadOptions', () => {
	let ctx: ReturnType<typeof mockDeep<ILoadOptionsFunctions>>;
	let request: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
		ctx = mockDeep<ILoadOptionsFunctions>();
		ctx.getNode.mockReturnValue(node);
		ctx.getCredentials.mockResolvedValue({ environmentUrl: BASE_URL });
		request = vi.fn();
		ctx.helpers.httpRequestWithAuthentication = request as never;
	});

	describe('getEntitySets', () => {
		it('maps entity definitions to sorted dropdown options', async () => {
			request.mockResolvedValue({
				value: [
					{
						LogicalName: 'account',
						EntitySetName: 'accounts',
						DisplayName: { UserLocalizedLabel: { Label: 'Account' } },
					},
					{
						LogicalName: 'contact',
						EntitySetName: 'contacts',
						DisplayName: { UserLocalizedLabel: { Label: 'Contact' } },
					},
				],
			});

			const options = await getEntitySets.call(ctx);

			expect(options).toEqual([
				{ name: 'Account (accounts)', value: 'accounts', description: 'Logical name: account' },
				{ name: 'Contact (contacts)', value: 'contacts', description: 'Logical name: contact' },
			]);
		});

		it('skips definitions without an EntitySetName', async () => {
			request.mockResolvedValue({
				value: [
					{ LogicalName: 'audit', EntitySetName: null },
					{ LogicalName: 'account', EntitySetName: 'accounts' },
				],
			});

			const options = await getEntitySets.call(ctx);

			expect(options).toEqual([
				{ name: 'account (accounts)', value: 'accounts', description: 'Logical name: account' },
			]);
		});

		it('falls back to the logical name when the label is blank', async () => {
			request.mockResolvedValue({
				value: [
					{
						LogicalName: 'account',
						EntitySetName: 'accounts',
						DisplayName: { UserLocalizedLabel: { Label: '   ' } },
					},
				],
			});

			const [option] = await getEntitySets.call(ctx);

			expect(option.name).toBe('account (accounts)');
		});

		it('throws when the credential is missing an environment URL', async () => {
			ctx.getCredentials.mockResolvedValue({ environmentUrl: '' });

			await expect(getEntitySets.call(ctx)).rejects.toThrow(NodeApiError);
			expect(request).not.toHaveBeenCalled();
		});

		it('wraps an upstream failure in NodeApiError with the Dataverse message', async () => {
			request.mockRejectedValue({
				statusCode: 400,
				response: { body: { error: { code: '0x80060888', message: 'Invalid $select' } } },
			});

			await expect(getEntitySets.call(ctx)).rejects.toThrow(/Invalid \$select/);
		});

		it('recovers the message from the legacy OData v3 error shape', async () => {
			request.mockRejectedValue({
				statusCode: 400,
				response: { body: { error: { message: { lang: 'en-US', value: 'Legacy message' } } } },
			});

			await expect(getEntitySets.call(ctx)).rejects.toThrow(/Legacy message/);
		});

		it('recovers the message from a nested cause.response.body envelope', async () => {
			request.mockRejectedValue({
				message: 'Bad request - please check your parameters',
				cause: {
					statusCode: 403,
					response: { body: { error: { code: '0x80072560', message: 'Insufficient privileges' } } },
				},
			});

			await expect(getEntitySets.call(ctx)).rejects.toThrow(/Insufficient privileges/);
		});

		it('applies the crafted message when the failure is already a NodeApiError', async () => {
			// Production shape: httpRequestWithAuthentication pre-wraps the axios
			// failure in a NodeApiError, which lifts the body text onto `.description`.
			const cause = Object.assign(new Error('Forbidden - perhaps check your credentials?'), {
				statusCode: 403,
				response: { data: { error: { code: '0x80072560', message: 'Insufficient privileges' } } },
			});
			request.mockRejectedValue(new NodeApiError(node, cause as unknown as JsonObject));

			const error = await getEntitySets.call(ctx).catch((e: unknown) => e);

			expect(error).toBeInstanceOf(NodeApiError);
			expect((error as Error).message).toContain('Insufficient privileges');
			expect((error as Error).message).not.toContain('perhaps check your credentials');
		});

		it('parses a raw JSON string error body', async () => {
			request.mockRejectedValue({
				statusCode: 400,
				response: { body: JSON.stringify({ error: { message: 'Stringified body' } }) },
			});

			await expect(getEntitySets.call(ctx)).rejects.toThrow(/Stringified body/);
		});

		it('falls back to the wrapper description when no body is reachable', async () => {
			request.mockRejectedValue({
				statusCode: 400,
				message: 'Bad request - please check your parameters',
				description: 'The authorization server denied the request',
			});

			await expect(getEntitySets.call(ctx)).rejects.toThrow(
				/The authorization server denied the request/,
			);
		});
	});

	describe('getColumns', () => {
		it('returns an empty list when no table is selected', async () => {
			ctx.getCurrentNodeParameter.mockReturnValue('');

			expect(await getColumns.call(ctx)).toEqual([]);
			expect(request).not.toHaveBeenCalled();
		});

		it('looks up the logical name then maps readable attributes', async () => {
			ctx.getCurrentNodeParameter.mockReturnValue({ mode: 'list', value: 'accounts' });
			request.mockResolvedValueOnce({ value: [{ LogicalName: 'account' }] }).mockResolvedValueOnce({
				value: [
					{
						LogicalName: 'name',
						DisplayName: { UserLocalizedLabel: { Label: 'Name' } },
					},
					{
						LogicalName: 'primarycontactid',
						AttributeType: 'Lookup',
						DisplayName: { UserLocalizedLabel: { Label: 'Primary Contact' } },
					},
					{ LogicalName: 'accountidname', AttributeOf: 'accountid' },
					{ LogicalName: 'hidden', IsValidForRead: false },
				],
			});

			const options = await getColumns.call(ctx);

			expect(options).toEqual([
				{ name: 'Name (name)', value: 'name' },
				{ name: 'Primary Contact (primarycontactid) — lookup', value: 'primarycontactid' },
			]);
			const [, attrOptions] = request.mock.calls[1];
			expect(attrOptions.qs.$select).toContain('AttributeType');
		});

		it('returns an empty list when the table lookup finds nothing', async () => {
			ctx.getCurrentNodeParameter.mockReturnValue('accounts');
			request.mockResolvedValueOnce({ value: [] });

			expect(await getColumns.call(ctx)).toEqual([]);
			expect(request).toHaveBeenCalledTimes(1);
		});

		it('escapes single quotes in the entity-set lookup filter', async () => {
			ctx.getCurrentNodeParameter.mockReturnValue("o'brien");
			request.mockResolvedValueOnce({ value: [] });

			await getColumns.call(ctx);

			const [, options] = request.mock.calls[0];
			expect(options.qs.$filter).toBe("EntitySetName eq 'o''brien'");
		});
	});

	describe('listSearch', () => {
		it('filters table locator results by display name', async () => {
			request.mockResolvedValue({
				value: [
					{
						LogicalName: 'account',
						EntitySetName: 'accounts',
						DisplayName: { UserLocalizedLabel: { Label: 'Account' } },
					},
					{
						LogicalName: 'contact',
						EntitySetName: 'contacts',
						DisplayName: { UserLocalizedLabel: { Label: 'Contact' } },
					},
				],
			});

			expect(await searchEntitySets.call(ctx, 'acc')).toEqual({
				results: [{ name: 'Account (accounts)', value: 'accounts' }],
			});
		});

		it('searches rows by the selected table primary name and returns primary IDs', async () => {
			ctx.getCurrentNodeParameter.mockReturnValue({ mode: 'list', value: 'accounts' });
			request
				.mockResolvedValueOnce({
					value: [{ PrimaryIdAttribute: 'accountid', PrimaryNameAttribute: 'name' }],
				})
				.mockResolvedValueOnce({
					value: [{ accountid: 'row-1', name: 'Acme' }],
				});

			expect(await searchRows.call(ctx, "Ac'me")).toEqual({
				results: [{ name: 'Acme (row-1)', value: 'row-1' }],
			});
			const [, metadataRequest] = request.mock.calls[0];
			expect(metadataRequest.qs.$filter).toBe("EntitySetName eq 'accounts'");
			const [, rowsRequest] = request.mock.calls[1];
			expect(rowsRequest.url).toContain('/accounts');
			expect(rowsRequest.qs).toEqual({
				$select: 'accountid,name',
				$filter: "contains(name,'Ac''me')",
			});
			// Server-driven paging, not a `$top` cap.
			expect(rowsRequest.qs.$top).toBeUndefined();
			expect(rowsRequest.headers.Prefer).toBe('odata.maxpagesize=100');
		});

		it('returns the @odata.nextLink as the pagination token', async () => {
			ctx.getCurrentNodeParameter.mockReturnValue({ mode: 'list', value: 'accounts' });
			const nextLink = `${BASE_URL}/api/data/v9.2/accounts?$select=accountid,name&$skiptoken=x`;
			request
				.mockResolvedValueOnce({
					value: [{ PrimaryIdAttribute: 'accountid', PrimaryNameAttribute: 'name' }],
				})
				.mockResolvedValueOnce({
					value: [{ accountid: 'row-1', name: 'Acme' }],
					'@odata.nextLink': nextLink,
				});

			expect(await searchRows.call(ctx)).toEqual({
				results: [{ name: 'Acme (row-1)', value: 'row-1' }],
				paginationToken: nextLink,
			});
		});

		it('follows the pagination token as the request URL without resending the query', async () => {
			ctx.getCurrentNodeParameter.mockReturnValue({ mode: 'list', value: 'accounts' });
			const token = `${BASE_URL}/api/data/v9.2/accounts?$select=accountid,name&$skiptoken=x`;
			request
				.mockResolvedValueOnce({
					value: [{ PrimaryIdAttribute: 'accountid', PrimaryNameAttribute: 'name' }],
				})
				.mockResolvedValueOnce({
					value: [{ accountid: 'row-2', name: 'Beta' }],
				});

			expect(await searchRows.call(ctx, undefined, token)).toEqual({
				results: [{ name: 'Beta (row-2)', value: 'row-2' }],
			});
			const [, pageRequest] = request.mock.calls[1];
			expect(pageRequest.url).toBe(token);
			// The nextLink already encodes the query; don't resend it.
			expect(pageRequest.qs).toEqual({});
			expect(pageRequest.headers.Prefer).toBe('odata.maxpagesize=100');
		});

		it('rejects a pagination token pointing outside the environment URL', async () => {
			ctx.getCurrentNodeParameter.mockReturnValue({ mode: 'list', value: 'accounts' });
			const evilToken = 'https://evil.example.com/api/data/v9.2/accounts?$skiptoken=x';
			request.mockResolvedValueOnce({
				value: [{ PrimaryIdAttribute: 'accountid', PrimaryNameAttribute: 'name' }],
			});

			await expect(searchRows.call(ctx, undefined, evilToken)).rejects.toThrow(
				/outside the configured Environment URL/,
			);
			// Only the metadata call ran; the cross-host page request was never dispatched.
			expect(request).toHaveBeenCalledTimes(1);
		});
	});
});
