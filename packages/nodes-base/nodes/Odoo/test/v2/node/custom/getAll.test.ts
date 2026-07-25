import type { IExecuteFunctions } from 'n8n-workflow';
import type { Mock } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';

import { versionDescription } from '../../../../v2/actions/versionDescription';
import { OdooV2 } from '../../../../v2/OdooV2.node';
import * as transport from '../../../../v2/transport';

vi.mock('../../../../v2/transport', () => ({
	odooApiRequest: vi.fn(),
}));

const MOCK_RECORDS = [
	{ id: 1, name: 'Record A' },
	{ id: 2, name: 'Record B' },
];

describe('OdooV2 — custom:getAll', () => {
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
			resource: 'custom',
			operation: 'getAll',
			authentication: 'odooApiKeyApi',
			customResource: 'res.partner',
			returnAll: false,
			limit: 10,
			options: {},
			...overrides,
		};
		exec.getInputData.mockReturnValue([{ json: {} }]);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		exec.getNodeParameter.mockImplementation((key: string) => params[key] as any);
	};

	it('returns records with a limit when returnAll is false', async () => {
		setupParams({ limit: 5 });
		(transport.odooApiRequest as Mock).mockResolvedValue(MOCK_RECORDS);

		const result = await node.execute.call(exec);

		expect(transport.odooApiRequest).toHaveBeenCalledWith('res.partner', 'search_read', {
			domain: [],
			fields: [],
			limit: 5,
			offset: 0,
		});
		expect(result[0]).toHaveLength(2);
	});

	it('omits limit when returnAll is true', async () => {
		setupParams({ returnAll: true });
		(transport.odooApiRequest as Mock).mockResolvedValue(MOCK_RECORDS);

		await node.execute.call(exec);

		expect(transport.odooApiRequest).toHaveBeenCalledWith('res.partner', 'search_read', {
			domain: [],
			fields: [],
			offset: 0,
		});
	});

	it('parses comma-separated fieldsList into an array', async () => {
		setupParams({ options: { fieldsList: 'name, email' } });
		(transport.odooApiRequest as Mock).mockResolvedValue(MOCK_RECORDS);

		await node.execute.call(exec);

		expect(transport.odooApiRequest).toHaveBeenCalledWith('res.partner', 'search_read', {
			domain: [],
			fields: ['name', 'email'],
			limit: 10,
			offset: 0,
		});
	});

	it('uses the model from the customResource RLC parameter', async () => {
		setupParams({ customResource: 'sale.order' });
		(transport.odooApiRequest as Mock).mockResolvedValue([]);

		await node.execute.call(exec);

		expect(transport.odooApiRequest).toHaveBeenCalledWith(
			'sale.order',
			'search_read',
			expect.anything(),
		);
	});

	it('returns each record as a separate output item', async () => {
		setupParams({ returnAll: true });
		(transport.odooApiRequest as Mock).mockResolvedValue(MOCK_RECORDS);

		const result = await node.execute.call(exec);

		expect(result[0]).toHaveLength(2);
		expect(result[0][0].json).toEqual(MOCK_RECORDS[0]);
		expect(result[0][1].json).toEqual(MOCK_RECORDS[1]);
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

	it('builds the domain from filters', async () => {
		setupParams({
			filters: {
				filter: [
					{ fieldName: 'name', operator: 'equal', value: 'Record A' },
					{ fieldName: 'email', operator: 'like', value: 'foo' },
				],
			},
		});
		(transport.odooApiRequest as Mock).mockResolvedValue(MOCK_RECORDS);

		await node.execute.call(exec);

		expect(transport.odooApiRequest).toHaveBeenCalledWith('res.partner', 'search_read', {
			domain: [
				['name', '=', 'Record A'],
				['email', 'like', 'foo'],
			],
			fields: [],
			limit: 10,
			offset: 0,
		});
	});
});
