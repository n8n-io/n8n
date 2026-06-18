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

const MOCK_ACTIVITIES = [
	{ id: 1, summary: 'Call Alice', res_model: 'res.partner', res_id: 10 },
	{ id: 2, summary: 'Email Bob', res_model: 'res.partner', res_id: 20 },
];

describe('OdooV2 — activity:getAll', () => {
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
			resource: 'activity',
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

	it('returns activities with a limit when returnAll is false', async () => {
		setupParams({ limit: 5 });
		(transport.odooApiRequest as Mock).mockResolvedValue(MOCK_ACTIVITIES);

		const result = await node.execute.call(exec);

		expect(transport.odooApiRequest).toHaveBeenCalledWith('mail.activity', 'search_read', {
			domain: [],
			fields: [],
			limit: 5,
			offset: 0,
		});
		expect(result[0]).toHaveLength(2);
	});

	it('omits limit when returnAll is true', async () => {
		setupParams({ returnAll: true });
		(transport.odooApiRequest as Mock).mockResolvedValue(MOCK_ACTIVITIES);

		await node.execute.call(exec);

		expect(transport.odooApiRequest).toHaveBeenCalledWith('mail.activity', 'search_read', {
			domain: [],
			fields: [],
			offset: 0,
		});
	});

	it('filters by res_model when provided', async () => {
		setupParams({ filters: { res_model: 'res.partner' } });
		(transport.odooApiRequest as Mock).mockResolvedValue(MOCK_ACTIVITIES);

		await node.execute.call(exec);

		expect(transport.odooApiRequest).toHaveBeenCalledWith(
			'mail.activity',
			'search_read',
			expect.objectContaining({ domain: [['res_model', '=', 'res.partner']] }),
		);
	});

	it('filters by res_model and res_id when both provided', async () => {
		setupParams({ filters: { res_model: 'res.partner', res_id: 42 } });
		(transport.odooApiRequest as Mock).mockResolvedValue([MOCK_ACTIVITIES[0]]);

		await node.execute.call(exec);

		expect(transport.odooApiRequest).toHaveBeenCalledWith(
			'mail.activity',
			'search_read',
			expect.objectContaining({
				domain: [
					['res_model', '=', 'res.partner'],
					['res_id', '=', 42],
				],
			}),
		);
	});

	it('returns each activity as a separate output item', async () => {
		setupParams({ returnAll: true });
		(transport.odooApiRequest as Mock).mockResolvedValue(MOCK_ACTIVITIES);

		const result = await node.execute.call(exec);

		expect(result[0]).toHaveLength(2);
		expect(result[0][0].json).toEqual(MOCK_ACTIVITIES[0]);
		expect(result[0][1].json).toEqual(MOCK_ACTIVITIES[1]);
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
