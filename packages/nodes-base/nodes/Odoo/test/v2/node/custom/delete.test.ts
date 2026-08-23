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

describe('OdooV2 — custom:delete', () => {
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
			resource: 'custom',
			operation: 'delete',
			authentication: 'odooApiKeyApi',
			customResource: 'res.partner',
			recordId: 7,
			...overrides,
		};
		exec.getInputData.mockReturnValue([{ json: {} }]);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		exec.getNodeParameter.mockImplementation((key: string) => params[key] as any);
	};

	it('deletes a record by ID and returns deleted:true', async () => {
		setupParams();
		(transport.odooApiRequest as Mock).mockResolvedValue(true);

		const result = await node.execute.call(exec);

		expect(transport.odooApiRequest).toHaveBeenCalledWith('res.partner', 'unlink', {
			ids: [7],
		});
		expect(result[0][0].json).toEqual({ id: 7, deleted: true });
	});

	it('uses the model from the customResource RLC parameter', async () => {
		setupParams({ customResource: 'sale.order', recordId: 99 });
		(transport.odooApiRequest as Mock).mockResolvedValue(true);

		await node.execute.call(exec);

		expect(transport.odooApiRequest).toHaveBeenCalledWith('sale.order', 'unlink', { ids: [99] });
	});

	it('returns error item and continues when continueOnFail is true', async () => {
		setupParams();
		exec.continueOnFail.mockReturnValue(true);
		(transport.odooApiRequest as Mock).mockRejectedValue(new Error('Delete failed'));

		const result = await node.execute.call(exec);

		expect(result[0][0].json).toEqual({ error: 'Delete failed' });
	});

	it('rethrows the error when continueOnFail is false', async () => {
		setupParams();
		exec.continueOnFail.mockReturnValue(false);
		(transport.odooApiRequest as Mock).mockRejectedValue(new Error('Delete failed'));

		await expect(node.execute.call(exec)).rejects.toThrow('Delete failed');
	});
});
