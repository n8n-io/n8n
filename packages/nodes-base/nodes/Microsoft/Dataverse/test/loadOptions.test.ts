// Fixtures and expected values below mirror Dataverse API responses (lowercase
// logical names, `{ name, value }` option shapes) — not node display-name params.
/* eslint-disable n8n-nodes-base/node-param-display-name-miscased */

import type { ILoadOptionsFunctions, INode } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { getColumns, getEntitySets } from '../loadOptions';

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
		ctx.helpers.requestWithAuthentication = request as never;
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
			ctx.getCurrentNodeParameter.mockReturnValue('accounts');
			request.mockResolvedValueOnce({ value: [{ LogicalName: 'account' }] }).mockResolvedValueOnce({
				value: [
					{
						LogicalName: 'name',
						DisplayName: { UserLocalizedLabel: { Label: 'Name' } },
					},
					{ LogicalName: 'accountidname', AttributeOf: 'accountid' },
					{ LogicalName: 'hidden', IsValidForRead: false },
				],
			});

			const options = await getColumns.call(ctx);

			expect(options).toEqual([{ name: 'Name (name)', value: 'name' }]);
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
});
