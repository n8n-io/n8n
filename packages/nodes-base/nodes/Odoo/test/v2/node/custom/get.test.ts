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

const MOCK_RECORD = { id: 7, name: 'Test Record', email: 'test@example.com' };

describe('OdooV2 — custom:get', () => {
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
			operation: 'get',
			authentication: 'odooApiKeyApi',
			customResource: 'res.partner',
			recordId: 7,
			options: {},
			...overrides,
		};
		exec.getInputData.mockReturnValue([{ json: {} }]);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		exec.getNodeParameter.mockImplementation((key: string) => params[key] as any);
	};

	it('fetches a record by ID with no field filter', async () => {
		setupParams();
		(transport.odooApiRequest as Mock).mockResolvedValue([MOCK_RECORD]);

		const result = await node.execute.call(exec);

		expect(transport.odooApiRequest).toHaveBeenCalledWith('res.partner', 'read', {
			ids: [7],
			fields: [],
		});
		expect(result[0][0].json).toEqual(MOCK_RECORD);
	});

	it('parses comma-separated fieldsList into an array', async () => {
		setupParams({ options: { fieldsList: 'name, email, phone' } });
		(transport.odooApiRequest as Mock).mockResolvedValue([MOCK_RECORD]);

		await node.execute.call(exec);

		expect(transport.odooApiRequest).toHaveBeenCalledWith('res.partner', 'read', {
			ids: [7],
			fields: ['name', 'email', 'phone'],
		});
	});

	it('uses the model from the customResource RLC parameter', async () => {
		setupParams({ customResource: 'sale.order', recordId: 99 });
		(transport.odooApiRequest as Mock).mockResolvedValue([{ id: 99 }]);

		await node.execute.call(exec);

		expect(transport.odooApiRequest).toHaveBeenCalledWith('sale.order', 'read', expect.anything());
	});

	it('returns error item and continues when continueOnFail is true', async () => {
		setupParams();
		exec.continueOnFail.mockReturnValue(true);
		(transport.odooApiRequest as Mock).mockRejectedValue(new Error('Not found'));

		const result = await node.execute.call(exec);

		expect(result[0][0].json).toEqual({ error: 'Not found' });
	});

	it('rethrows the error when continueOnFail is false', async () => {
		setupParams();
		exec.continueOnFail.mockReturnValue(false);
		(transport.odooApiRequest as Mock).mockRejectedValue(new Error('Not found'));

		await expect(node.execute.call(exec)).rejects.toThrow('Not found');
	});
});
