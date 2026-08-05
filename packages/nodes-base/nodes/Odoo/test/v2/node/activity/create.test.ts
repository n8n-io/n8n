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

const MOCK_ACTIVITY_ID = 5;
const MOCK_MODEL_RECORD = [{ id: 3 }];

describe('OdooV2 — activity:create', () => {
	let node: OdooV2;
	let exec: MockProxy<IExecuteFunctions>;

	beforeEach(() => {
		node = new OdooV2(versionDescription);
		exec = mock<IExecuteFunctions>();
		exec.helpers = {
			constructExecutionMetaData: vi.fn((data) => data),
			returnJsonArray: vi.fn((data) =>
				(Array.isArray(data) ? data : [data]).map((j) => ({ json: j })),
			),
		} as any;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	const setupParams = (overrides: Record<string, unknown> = {}) => {
		const params: Record<string, unknown> = {
			resource: 'activity',
			operation: 'create',
			authentication: 'odooApiKeyApi',
			res_model: 'res.partner',
			res_id: 42,
			activity_type_id: 1,
			'additionalFields.mappingMode': 'defineBelow',
			'additionalFields.value': {},
			...overrides,
		};
		exec.getInputData.mockReturnValue([{ json: {} }]);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		exec.getNodeParameter.mockImplementation((key: string) => params[key] as any);
	};

	it('looks up ir.model ID and creates an activity with res_model_id', async () => {
		setupParams();
		(transport.odooApiRequest as Mock)
			.mockResolvedValueOnce(MOCK_MODEL_RECORD)
			.mockResolvedValueOnce([MOCK_ACTIVITY_ID]);

		const result = await node.execute.call(exec);

		expect(transport.odooApiRequest).toHaveBeenNthCalledWith(1, 'ir.model', 'search_read', {
			domain: [['model', '=', 'res.partner']],
			fields: ['id'],
			limit: 1,
			offset: 0,
		});
		expect(transport.odooApiRequest).toHaveBeenNthCalledWith(2, 'mail.activity', 'create', {
			vals_list: [{ res_model_id: 3, res_id: 42, activity_type_id: 1 }],
		});
		expect(result[0][0].json).toEqual({ id: MOCK_ACTIVITY_ID });
	});

	it('merges RMC additional fields into the create payload', async () => {
		setupParams({
			'additionalFields.value': { summary: 'Follow up', date_deadline: '2025-06-01' },
		});
		(transport.odooApiRequest as Mock)
			.mockResolvedValueOnce(MOCK_MODEL_RECORD)
			.mockResolvedValueOnce([MOCK_ACTIVITY_ID]);

		await node.execute.call(exec);

		expect(transport.odooApiRequest).toHaveBeenNthCalledWith(2, 'mail.activity', 'create', {
			vals_list: [
				{
					summary: 'Follow up',
					date_deadline: '2025-06-01',
					res_model_id: 3,
					res_id: 42,
					activity_type_id: 1,
				},
			],
		});
	});

	it('explicit RLC fields override RMC values', async () => {
		setupParams({
			'additionalFields.value': { activity_type_id: 99 },
		});
		(transport.odooApiRequest as Mock)
			.mockResolvedValueOnce(MOCK_MODEL_RECORD)
			.mockResolvedValueOnce([MOCK_ACTIVITY_ID]);

		await node.execute.call(exec);

		// activity_type_id from RLC (1) should win over RMC value (99)
		expect(transport.odooApiRequest).toHaveBeenNthCalledWith(2, 'mail.activity', 'create', {
			vals_list: [expect.objectContaining({ activity_type_id: 1 })],
		});
	});

	it('uses item json when mappingMode is autoMapInputData', async () => {
		setupParams({ 'additionalFields.mappingMode': 'autoMapInputData' });
		exec.getInputData.mockReturnValue([{ json: { summary: 'Auto', note: 'Test' } }]);
		(transport.odooApiRequest as Mock)
			.mockResolvedValueOnce(MOCK_MODEL_RECORD)
			.mockResolvedValueOnce([MOCK_ACTIVITY_ID]);

		await node.execute.call(exec);

		expect(transport.odooApiRequest).toHaveBeenNthCalledWith(2, 'mail.activity', 'create', {
			vals_list: [expect.objectContaining({ summary: 'Auto', note: 'Test' })],
		});
	});

	it('extracts scalar id when Odoo returns a plain number', async () => {
		setupParams();
		(transport.odooApiRequest as Mock)
			.mockResolvedValueOnce(MOCK_MODEL_RECORD)
			.mockResolvedValueOnce(MOCK_ACTIVITY_ID);

		const result = await node.execute.call(exec);

		expect(result[0][0].json).toEqual({ id: MOCK_ACTIVITY_ID });
	});

	it('returns error item and continues when continueOnFail is true', async () => {
		setupParams();
		exec.continueOnFail.mockReturnValue(true);
		(transport.odooApiRequest as Mock).mockRejectedValue(new Error('Odoo error'));

		const result = await node.execute.call(exec);

		expect(result[0][0].json).toEqual({ error: 'Odoo error' });
	});

	it('rethrows the error when continueOnFail is false', async () => {
		setupParams();
		exec.continueOnFail.mockReturnValue(false);
		(transport.odooApiRequest as Mock).mockRejectedValue(new Error('Odoo error'));

		await expect(node.execute.call(exec)).rejects.toThrow('Odoo error');
	});
});
