import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import { OdooV2 } from '../../../../v2/OdooV2.node';
import { versionDescription } from '../../../../v2/actions/versionDescription';
import * as transport from '../../../../v2/transport';
import type { Mock } from 'vitest';

vi.mock('../../../../v2/transport', () => ({
	odooApiRequest: vi.fn(),
}));

const MOCK_CONTACTS = [
	{ id: 1, name: 'Alice', email: 'alice@example.com' },
	{ id: 2, name: 'Bob', email: 'bob@example.com' },
];

describe('OdooV2 — contact:getAll', () => {
	let node: OdooV2;
	let exec: MockProxy<IExecuteFunctions>;

	beforeEach(() => {
		node = new OdooV2(versionDescription);
		exec = mock<IExecuteFunctions>();
		exec.helpers = {
			constructExecutionMetaData: vi.fn((data) => data),
			returnJsonArray: vi.fn((data: unknown) =>
				(Array.isArray(data) ? data : [data]).map((j: unknown) => ({ json: j })),
			),
		} as any;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	const setupParams = (overrides: Record<string, unknown> = {}) => {
		const params: Record<string, unknown> = {
			resource: 'contact',
			operation: 'getAll',
			authentication: 'odooApiKeyApi',
			returnAll: false,
			limit: 10,
			filters: {},
			options: {},
			...overrides,
		};
		exec.getInputData.mockReturnValue([{ json: {} }]);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		exec.getNodeParameter.mockImplementation((key: string) => params[key] as any);
	};

	it('returns contacts with a limit when returnAll is false', async () => {
		setupParams({ limit: 2 });
		(transport.odooApiRequest as Mock).mockResolvedValue(MOCK_CONTACTS);

		const result = await node.execute.call(exec);

		expect(transport.odooApiRequest).toHaveBeenCalledWith('res.partner', 'search_read', {
			domain: [],
			fields: [],
			limit: 2,
			offset: 0,
		});
		expect(result[0]).toHaveLength(2);
	});

	it('omits limit when returnAll is true (limit=0 means SQL LIMIT 0, not unlimited)', async () => {
		setupParams({ returnAll: true });
		(transport.odooApiRequest as Mock).mockResolvedValue(MOCK_CONTACTS);

		await node.execute.call(exec);

		expect(transport.odooApiRequest).toHaveBeenCalledWith('res.partner', 'search_read', {
			domain: [],
			fields: [],
			offset: 0,
		});
	});

	it('passes selected fields to the API call', async () => {
		setupParams({ options: { fieldsList: ['name', 'email'] } });
		(transport.odooApiRequest as Mock).mockResolvedValue(MOCK_CONTACTS);

		await node.execute.call(exec);

		expect(transport.odooApiRequest).toHaveBeenCalledWith('res.partner', 'search_read', {
			domain: [],
			fields: ['name', 'email'],
			limit: 10,
			offset: 0,
		});
	});

	it('passes filters (domain) to the API call', async () => {
		setupParams({
			filters: {
				filter: [{ fieldName: 'email', operator: 'equal', value: 'alice@example.com' }],
			},
		});
		(transport.odooApiRequest as Mock).mockResolvedValue([MOCK_CONTACTS[0]]);

		await node.execute.call(exec);

		expect(transport.odooApiRequest).toHaveBeenCalledWith('res.partner', 'search_read', {
			domain: [['email', '=', 'alice@example.com']],
			fields: [],
			limit: 10,
			offset: 0,
		});
	});

	it('converts comma-separated string to list for in operator', async () => {
		setupParams({
			filters: {
				filter: [{ fieldName: 'id', operator: 'in', value: '1, 2, 3' }],
			},
		});
		(transport.odooApiRequest as Mock).mockResolvedValue([MOCK_CONTACTS[0]]);

		await node.execute.call(exec);

		expect(transport.odooApiRequest).toHaveBeenCalledWith('res.partner', 'search_read', {
			domain: [['id', 'in', [1, 2, 3]]],
			fields: [],
			limit: 10,
			offset: 0,
		});
	});

	it('converts comma-separated string to list for not in operator', async () => {
		setupParams({
			filters: {
				filter: [{ fieldName: 'id', operator: 'notIn', value: '10, 20' }],
			},
		});
		(transport.odooApiRequest as Mock).mockResolvedValue([]);

		await node.execute.call(exec);

		expect(transport.odooApiRequest).toHaveBeenCalledWith('res.partner', 'search_read', {
			domain: [['id', 'not in', [10, 20]]],
			fields: [],
			limit: 10,
			offset: 0,
		});
	});

	it('returns each contact as a separate output item', async () => {
		setupParams({ returnAll: true });
		(transport.odooApiRequest as Mock).mockResolvedValue(MOCK_CONTACTS);

		const result = await node.execute.call(exec);

		expect(result[0]).toHaveLength(2);
		expect(result[0][0].json).toEqual(MOCK_CONTACTS[0]);
		expect(result[0][1].json).toEqual(MOCK_CONTACTS[1]);
	});

	it('returns error item and continues when continueOnFail is true', async () => {
		setupParams();
		exec.continueOnFail.mockReturnValue(true);
		(transport.odooApiRequest as Mock).mockRejectedValue(new Error('Network error'));

		const result = await node.execute.call(exec);

		expect(result[0][0].json).toEqual({ error: 'Network error' });
	});

	it('rethrows the error when continueOnFail is false', async () => {
		setupParams();
		exec.continueOnFail.mockReturnValue(false);
		(transport.odooApiRequest as Mock).mockRejectedValue(new Error('Network error'));

		await expect(node.execute.call(exec)).rejects.toThrow('Network error');
	});
});
