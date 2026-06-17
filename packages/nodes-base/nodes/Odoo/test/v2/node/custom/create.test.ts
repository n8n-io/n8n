import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import { OdooV2 } from '../../../../v2/OdooV2.node';
import { versionDescription } from '../../../../v2/actions/versionDescription';
import * as transport from '../../../../v2/transport';

jest.mock('../../../../v2/transport', () => ({
	odooApiRequest: jest.fn(),
}));

const MOCK_RECORD_ID = 7;

describe('OdooV2 — custom:create', () => {
	let node: OdooV2;
	let exec: MockProxy<IExecuteFunctions>;

	beforeEach(() => {
		node = new OdooV2(versionDescription);
		exec = mock<IExecuteFunctions>();
		exec.helpers = {
			constructExecutionMetaData: jest.fn((data) => data),
			returnJsonArray: jest.fn((data) =>
				(Array.isArray(data) ? data : [data]).map((j) => ({ json: j })),
			),
		} as any;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	const setupParams = (overrides: Record<string, unknown> = {}) => {
		const params: Record<string, unknown> = {
			resource: 'custom',
			operation: 'create',
			authentication: 'odooApiKeyApi',
			customResource: 'res.partner',
			'fieldsToSend.mappingMode': 'defineBelow',
			'fieldsToSend.value': { name: 'Test Record' },
			...overrides,
		};
		exec.getInputData.mockReturnValue([{ json: {} }]);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		exec.getNodeParameter.mockImplementation((key: string) => params[key] as any);
	};

	it('creates a record using defineBelow mapping and returns its id', async () => {
		setupParams();
		(transport.odooApiRequest as jest.Mock).mockResolvedValue([MOCK_RECORD_ID]);

		const result = await node.execute.call(exec);

		expect(transport.odooApiRequest).toHaveBeenCalledWith('res.partner', 'create', {
			vals_list: [{ name: 'Test Record' }],
		});
		expect(result[0][0].json).toEqual({ id: MOCK_RECORD_ID });
	});

	it('uses item json directly when mappingMode is autoMapInputData', async () => {
		setupParams({ 'fieldsToSend.mappingMode': 'autoMapInputData' });
		exec.getInputData.mockReturnValue([
			{ json: { name: 'Auto Record', email: 'auto@example.com' } },
		]);
		(transport.odooApiRequest as jest.Mock).mockResolvedValue([MOCK_RECORD_ID]);

		await node.execute.call(exec);

		expect(transport.odooApiRequest).toHaveBeenCalledWith('res.partner', 'create', {
			vals_list: [{ name: 'Auto Record', email: 'auto@example.com' }],
		});
	});

	it('extracts scalar id when Odoo returns a plain number', async () => {
		setupParams();
		(transport.odooApiRequest as jest.Mock).mockResolvedValue(MOCK_RECORD_ID);

		const result = await node.execute.call(exec);

		expect(result[0][0].json).toEqual({ id: MOCK_RECORD_ID });
	});

	it('uses the model from the customResource RLC parameter', async () => {
		setupParams({ customResource: 'sale.order' });
		(transport.odooApiRequest as jest.Mock).mockResolvedValue([MOCK_RECORD_ID]);

		await node.execute.call(exec);

		expect(transport.odooApiRequest).toHaveBeenCalledWith(
			'sale.order',
			'create',
			expect.anything(),
		);
	});

	it('returns error item and continues when continueOnFail is true', async () => {
		setupParams();
		exec.continueOnFail.mockReturnValue(true);
		(transport.odooApiRequest as jest.Mock).mockRejectedValue(new Error('Odoo error'));

		const result = await node.execute.call(exec);

		expect(result[0][0].json).toEqual({ error: 'Odoo error' });
	});

	it('rethrows the error when continueOnFail is false', async () => {
		setupParams();
		exec.continueOnFail.mockReturnValue(false);
		(transport.odooApiRequest as jest.Mock).mockRejectedValue(new Error('Odoo error'));

		await expect(node.execute.call(exec)).rejects.toThrow('Odoo error');
	});
});
