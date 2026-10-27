import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import { bodyToRpcArgs, odooApiRequest } from '../../../v2/transport';
import type * as _importType0 from 'n8n-workflow';

vi.mock('n8n-workflow', async () => ({
	...(await vi.importActual<typeof _importType0>('n8n-workflow')),
	randomInt: vi.fn(() => 1),
}));

// ─── bodyToRpcArgs ────────────────────────────────────────────────────────────

describe('bodyToRpcArgs', () => {
	it('create: returns first item from vals_list', () => {
		expect(bodyToRpcArgs('create', { vals_list: [{ name: 'Test' }] })).toEqual([{ name: 'Test' }]);
	});

	it('create: falls back to whole body when vals_list is absent', () => {
		expect(bodyToRpcArgs('create', { name: 'Test' })).toEqual([{ name: 'Test' }]);
	});

	it('read: returns ids and fields', () => {
		expect(bodyToRpcArgs('read', { ids: [1, 2], fields: ['name', 'email'] })).toEqual([
			[1, 2],
			['name', 'email'],
		]);
	});

	it('read: defaults to empty fields array when omitted', () => {
		expect(bodyToRpcArgs('read', { ids: [1] })).toEqual([[1], []]);
	});

	it('search_read: includes limit when defined', () => {
		expect(
			bodyToRpcArgs('search_read', {
				domain: [['name', '=', 'foo']],
				fields: ['id'],
				offset: 0,
				limit: 10,
			}),
		).toEqual([[['name', '=', 'foo']], ['id'], 0, 10]);
	});

	it('search_read: omits limit when undefined', () => {
		expect(bodyToRpcArgs('search_read', { domain: [], fields: ['id'], offset: 0 })).toEqual([
			[],
			['id'],
			0,
		]);
	});

	it('search_read: defaults domain, fields, offset', () => {
		expect(bodyToRpcArgs('search_read', {})).toEqual([[], [], 0]);
	});

	it('write: returns ids and vals', () => {
		expect(bodyToRpcArgs('write', { ids: [5], vals: { name: 'Updated' } })).toEqual([
			[5],
			{ name: 'Updated' },
		]);
	});

	it('write: defaults vals to empty object when omitted', () => {
		expect(bodyToRpcArgs('write', { ids: [5] })).toEqual([[5], {}]);
	});

	it('unlink: returns ids only', () => {
		expect(bodyToRpcArgs('unlink', { ids: [3, 4] })).toEqual([[3, 4]]);
	});

	it('fields_get: returns empty array and attributes', () => {
		expect(bodyToRpcArgs('fields_get', { attributes: ['string', 'type'] })).toEqual([
			[],
			['string', 'type'],
		]);
	});

	it('fields_get: defaults attributes to empty array', () => {
		expect(bodyToRpcArgs('fields_get', {})).toEqual([[], []]);
	});

	it('default_get: returns fields_list', () => {
		expect(bodyToRpcArgs('default_get', { fields_list: ['name', 'email'] })).toEqual([
			['name', 'email'],
		]);
	});

	it('default_get: defaults to empty array', () => {
		expect(bodyToRpcArgs('default_get', {})).toEqual([[]]);
	});

	it('unknown method: wraps whole body', () => {
		expect(bodyToRpcArgs('custom_method', { foo: 'bar' })).toEqual([{ foo: 'bar' }]);
	});
});

// ─── odooApiRequest ───────────────────────────────────────────────────────────

describe('odooApiRequest', () => {
	let ctx: MockProxy<IExecuteFunctions>;

	beforeEach(() => {
		ctx = mock<IExecuteFunctions>();
		ctx.getNode.mockReturnValue({ name: 'Odoo', type: 'n8n-nodes-base.odoo' } as any);
	});

	afterEach(() => vi.clearAllMocks());

	describe('API key auth (callJson2)', () => {
		beforeEach(() => {
			ctx.getNodeParameter.mockReturnValue('odooApiKeyApi');
			ctx.getCredentials.mockResolvedValue({
				url: 'https://myorg.odoo.com',
				apiKey: 'test-key',
				db: '',
			});
			ctx.helpers = {
				httpRequestWithAuthentication: vi.fn().mockResolvedValue([{ id: 1, name: 'Test' }]),
			} as any;
		});

		it('POSTs to /json/2/<model>/<method> with body', async () => {
			const result = await odooApiRequest.call(ctx, 'res.partner', 'search_read', {
				domain: [],
				fields: ['id'],
			});

			expect(ctx.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'odooApiKeyApi',
				expect.objectContaining({
					method: 'POST',
					url: 'https://myorg.odoo.com/json/2/res.partner/search_read',
					body: { domain: [], fields: ['id'] },
					json: true,
				}),
			);
			expect(result).toEqual([{ id: 1, name: 'Test' }]);
		});

		it('sends create body as vals_list', async () => {
			await odooApiRequest.call(ctx, 'res.partner', 'create', {
				vals_list: [{ name: 'Jane Doe', email: 'jane@example.com' }],
			});

			expect(ctx.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'odooApiKeyApi',
				expect.objectContaining({
					url: 'https://myorg.odoo.com/json/2/res.partner/create',
					body: { vals_list: [{ name: 'Jane Doe', email: 'jane@example.com' }] },
				}),
			);
		});

		it('strips trailing slash from URL', async () => {
			ctx.getCredentials.mockResolvedValue({ url: 'https://myorg.odoo.com/', db: '' });
			await odooApiRequest.call(ctx, 'res.partner', 'read', { ids: [1], fields: [] });
			expect(ctx.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'odooApiKeyApi',
				expect.objectContaining({ url: 'https://myorg.odoo.com/json/2/res.partner/read' }),
			);
		});

		it('includes X-Odoo-Database header when db is set', async () => {
			ctx.getCredentials.mockResolvedValue({
				url: 'https://myorg.odoo.com',
				db: 'mydb',
			});
			await odooApiRequest.call(ctx, 'res.partner', 'read', { ids: [1], fields: [] });
			expect(ctx.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'odooApiKeyApi',
				expect.objectContaining({
					headers: expect.objectContaining({ 'X-Odoo-Database': 'mydb' }),
				}),
			);
		});

		it('derives X-Odoo-Database from subdomain when db is empty', async () => {
			ctx.getCredentials.mockResolvedValue({ url: 'https://myorg.odoo.com', db: '' });
			await odooApiRequest.call(ctx, 'res.partner', 'read', { ids: [1], fields: [] });
			expect(ctx.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'odooApiKeyApi',
				expect.objectContaining({
					headers: expect.objectContaining({ 'X-Odoo-Database': 'myorg' }),
				}),
			);
		});

		it('throws NodeApiError on HTTP failure', async () => {
			ctx.helpers = {
				httpRequestWithAuthentication: vi.fn().mockRejectedValue(new Error('Network error')),
			} as any;
			await expect(
				odooApiRequest.call(ctx, 'res.partner', 'search_read', {}),
			).rejects.toBeDefined();
		});
	});

	describe('legacy RPC auth (rpcRequest)', () => {
		beforeEach(() => {
			ctx.getNodeParameter.mockReturnValue('odooApi');
			ctx.getCredentials.mockResolvedValue({
				url: 'https://myorg.odoo.com',
				username: 'admin',
				password: 'pass',
				db: 'mydb',
			});
			ctx.helpers = {
				httpRequest: vi
					.fn()
					.mockResolvedValueOnce({ result: 1 }) // getRpcUserID login
					.mockResolvedValueOnce({ result: [{ id: 1 }] }), // execute
			} as any;
		});

		it('logs in then executes via /jsonrpc', async () => {
			const result = await odooApiRequest.call(ctx, 'res.partner', 'search_read', {
				domain: [],
				fields: ['id'],
				offset: 0,
			});

			expect(ctx.helpers.httpRequest).toHaveBeenCalledTimes(2);
			// First call: login
			expect(ctx.helpers.httpRequest).toHaveBeenNthCalledWith(
				1,
				expect.objectContaining({
					url: 'https://myorg.odoo.com/jsonrpc',
					body: expect.objectContaining({
						params: expect.objectContaining({ service: 'common', method: 'login' }),
					}),
				}),
			);
			// Second call: execute
			expect(ctx.helpers.httpRequest).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({
					url: 'https://myorg.odoo.com/jsonrpc',
					body: expect.objectContaining({
						params: expect.objectContaining({ service: 'object', method: 'execute' }),
					}),
				}),
			);
			expect(result).toEqual([{ id: 1 }]);
		});

		it('throws when login returns an error', async () => {
			ctx.helpers = {
				httpRequest: vi.fn().mockResolvedValue({
					error: { data: { message: 'Invalid credentials' } },
				}),
			} as any;
			await expect(
				odooApiRequest.call(ctx, 'res.partner', 'search_read', {}),
			).rejects.toBeDefined();
		});

		it('throws when execute response contains an error', async () => {
			ctx.helpers = {
				httpRequest: vi
					.fn()
					.mockResolvedValueOnce({ result: 1 })
					.mockResolvedValueOnce({ error: { data: { message: 'Access denied' } } }),
			} as any;
			await expect(
				odooApiRequest.call(ctx, 'res.partner', 'search_read', {}),
			).rejects.toBeDefined();
		});
	});
});
