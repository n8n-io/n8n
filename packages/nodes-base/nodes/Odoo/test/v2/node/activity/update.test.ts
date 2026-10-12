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

describe('OdooV2 — activity:update', () => {
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
			operation: 'update',
			authentication: 'odooApiKeyApi',
			activityId: 5,
			'fieldsToSend.mappingMode': 'defineBelow',
			'fieldsToSend.value': {},
			...overrides,
		};
		exec.getInputData.mockReturnValue([{ json: {} }]);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		exec.getNodeParameter.mockImplementation((key: string) => params[key] as any);
	};

	it('updates an activity with defineBelow fields and returns updated:true', async () => {
		setupParams({
			'fieldsToSend.value': { summary: 'Updated summary', date_deadline: '2025-07-01' },
		});
		(transport.odooApiRequest as Mock).mockResolvedValue(true);

		const result = await node.execute.call(exec);

		expect(transport.odooApiRequest).toHaveBeenCalledWith('mail.activity', 'write', {
			ids: [5],
			vals: { summary: 'Updated summary', date_deadline: '2025-07-01' },
		});
		expect(result[0][0].json).toEqual({ id: 5, updated: true });
	});

	it('converts an ISO 8601 date value to Odoo date format before write', async () => {
		setupParams({
			'fieldsToSend.value': { date_deadline: '2026-07-14T00:30:00.000+05:30' },
		});
		(transport.odooApiRequest as Mock)
			.mockResolvedValueOnce({ date_deadline: { type: 'date' } })
			.mockResolvedValue(true);

		await node.execute.call(exec);

		expect(transport.odooApiRequest).toHaveBeenNthCalledWith(1, 'mail.activity', 'fields_get', {
			attributes: ['type'],
		});
		expect(transport.odooApiRequest).toHaveBeenNthCalledWith(2, 'mail.activity', 'write', {
			ids: [5],
			vals: { date_deadline: '2026-07-14' },
		});
	});

	it('returns an error item when the schema request fails and continueOnFail is true', async () => {
		setupParams({
			'fieldsToSend.value': { date_deadline: '2026-07-14T00:00:00.000Z' },
		});
		exec.continueOnFail.mockReturnValue(true);
		(transport.odooApiRequest as Mock).mockRejectedValue(new Error('Schema request failed'));

		const result = await node.execute.call(exec);

		expect(result[0][0].json).toEqual({ error: 'Schema request failed' });
		expect(transport.odooApiRequest).not.toHaveBeenCalledWith(
			'mail.activity',
			'write',
			expect.anything(),
		);
	});

	it('uses item json directly when mappingMode is autoMapInputData', async () => {
		setupParams({ 'fieldsToSend.mappingMode': 'autoMapInputData' });
		exec.getInputData.mockReturnValue([{ json: { summary: 'Auto Update', note: 'hello' } }]);
		(transport.odooApiRequest as Mock).mockResolvedValue(true);

		await node.execute.call(exec);

		expect(transport.odooApiRequest).toHaveBeenCalledWith('mail.activity', 'write', {
			ids: [5],
			vals: { summary: 'Auto Update', note: 'hello' },
		});
	});

	it('returns error item and continues when continueOnFail is true', async () => {
		setupParams();
		exec.continueOnFail.mockReturnValue(true);
		(transport.odooApiRequest as Mock).mockRejectedValue(new Error('Write failed'));

		const result = await node.execute.call(exec);

		expect(result[0][0].json).toEqual({ error: 'Write failed' });
	});

	it('rethrows the error when continueOnFail is false', async () => {
		setupParams();
		exec.continueOnFail.mockReturnValue(false);
		(transport.odooApiRequest as Mock).mockRejectedValue(new Error('Write failed'));

		await expect(node.execute.call(exec)).rejects.toThrow('Write failed');
	});
});
