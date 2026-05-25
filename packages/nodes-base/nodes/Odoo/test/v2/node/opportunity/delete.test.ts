import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import { OdooV2 } from '../../../../v2/OdooV2.node';
import { versionDescription } from '../../../../v2/actions/versionDescription';
import * as transport from '../../../../v2/transport';

jest.mock('../../../../v2/transport', () => ({
	odooApiRequest: jest.fn(),
}));

const OPPORTUNITY_ID = 42;

describe('OdooV2 — opportunity:delete', () => {
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
			resource: 'opportunity',
			operation: 'delete',
			authentication: 'odooApiKeyApi',
			opportunityId: OPPORTUNITY_ID,
			...overrides,
		};
		exec.getInputData.mockReturnValue([{ json: {} }]);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		exec.getNodeParameter.mockImplementation((key: string) => params[key] as any);
	};

	it('deletes an opportunity and returns id + deleted flag', async () => {
		setupParams();
		(transport.odooApiRequest as jest.Mock).mockResolvedValue(true);

		const result = await node.execute.call(exec);

		expect(transport.odooApiRequest).toHaveBeenCalledWith('crm.lead', 'unlink', {
			ids: [OPPORTUNITY_ID],
		});
		expect(result[0][0].json).toEqual({ id: OPPORTUNITY_ID, deleted: true });
	});

	it('returns error item and continues when continueOnFail is true', async () => {
		setupParams();
		exec.continueOnFail.mockReturnValue(true);
		(transport.odooApiRequest as jest.Mock).mockRejectedValue(new Error('Delete failed'));

		const result = await node.execute.call(exec);

		expect(result[0][0].json).toEqual({ error: 'Delete failed' });
	});

	it('rethrows the error when continueOnFail is false', async () => {
		setupParams();
		exec.continueOnFail.mockReturnValue(false);
		(transport.odooApiRequest as jest.Mock).mockRejectedValue(new Error('Delete failed'));

		await expect(node.execute.call(exec)).rejects.toThrow('Delete failed');
	});
});
