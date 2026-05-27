import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import { OdooV2 } from '../../../../v2/OdooV2.node';
import { versionDescription } from '../../../../v2/actions/versionDescription';
import * as transport from '../../../../v2/transport';

jest.mock('../../../../v2/transport', () => ({
	odooApiRequest: jest.fn(),
}));

const MOCK_OPPORTUNITIES = [
	{ id: 1, name: 'Deal A' },
	{ id: 2, name: 'Deal B' },
];

describe('OdooV2 — opportunity:getAll', () => {
	let node: OdooV2;
	let exec: MockProxy<IExecuteFunctions>;

	beforeEach(() => {
		node = new OdooV2(versionDescription);
		exec = mock<IExecuteFunctions>();
		exec.helpers = {
			constructExecutionMetaData: jest.fn((data) => data),
			returnJsonArray: jest.fn((data: unknown) =>
				(Array.isArray(data) ? data : [data]).map((j: unknown) => ({ json: j })),
			),
		} as any;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	const setupParams = (overrides: Record<string, unknown> = {}) => {
		const params: Record<string, unknown> = {
			resource: 'opportunity',
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

	it('returns opportunities with a limit when returnAll is false', async () => {
		setupParams({ limit: 2 });
		(transport.odooApiRequest as jest.Mock).mockResolvedValue(MOCK_OPPORTUNITIES);

		const result = await node.execute.call(exec);

		expect(transport.odooApiRequest).toHaveBeenCalledWith('crm.lead', 'search_read', {
			domain: [],
			fields: [],
			limit: 2,
			offset: 0,
		});
		expect(result[0]).toHaveLength(2);
	});

	it('omits limit when returnAll is true (limit=0 means SQL LIMIT 0, not unlimited)', async () => {
		setupParams({ returnAll: true });
		(transport.odooApiRequest as jest.Mock).mockResolvedValue(MOCK_OPPORTUNITIES);

		await node.execute.call(exec);

		const callArgs = (transport.odooApiRequest as jest.Mock).mock.calls[0][2] as Record<
			string,
			unknown
		>;
		expect(callArgs).not.toHaveProperty('limit');
		expect(transport.odooApiRequest).toHaveBeenCalledWith('crm.lead', 'search_read', {
			domain: [],
			fields: [],
			offset: 0,
		});
	});

	it('returns error item and continues when continueOnFail is true', async () => {
		setupParams();
		exec.continueOnFail.mockReturnValue(true);
		(transport.odooApiRequest as jest.Mock).mockRejectedValue(new Error('Network error'));

		const result = await node.execute.call(exec);

		expect(result[0][0].json).toEqual({ error: 'Network error' });
	});

	it('rethrows the error when continueOnFail is false', async () => {
		setupParams();
		exec.continueOnFail.mockReturnValue(false);
		(transport.odooApiRequest as jest.Mock).mockRejectedValue(new Error('Network error'));

		await expect(node.execute.call(exec)).rejects.toThrow('Network error');
	});
});
