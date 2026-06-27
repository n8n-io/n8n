import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import type * as TransportModule from '../../transport';

// Replace the transport's microsoftApiRequest with a spy so we can assert the exact Graph
// resource path the operation builds — without issuing a request.
const { microsoftApiRequest } = vi.hoisted(() => ({ microsoftApiRequest: vi.fn() }));
vi.mock('../../transport', async (importOriginal) => {
	const actual = await importOriginal<typeof TransportModule>();
	return { ...actual, microsoftApiRequest };
});

import { execute } from '../../actions/worksheet/readRows.operation';

// Path-interpolated item ids are encodeURIComponent'd before they hit Graph (mirroring the
// OneDrive hardening). The worksheet RLC validates the id shape in the UI, but an expression
// or API-set value can bypass that — so the operation must still encode, ensuring a `/` in an
// id can never collapse the URL path or traverse.
describe('Microsoft Excel readRows path-id encoding', () => {
	const mockNode: INode = {
		id: 'n',
		name: 'Excel',
		type: 'n8n-nodes-base.microsoftExcel',
		typeVersion: 2,
		position: [0, 0],
		parameters: {},
	};

	it('encodeURIComponent-wraps the worksheet id before interpolating it into the Graph path', async () => {
		microsoftApiRequest.mockResolvedValue({ values: [['id'], [1]] });
		const ctx = mockDeep<IExecuteFunctions>();
		ctx.getNode.mockReturnValue(mockNode);
		ctx.continueOnFail.mockReturnValue(false);
		ctx.helpers.constructExecutionMetaData.mockReturnValue([]);
		ctx.helpers.returnJsonArray.mockReturnValue([]);
		const params: Record<string, unknown> = {
			workbook: 'WB',
			worksheet: 'a/../b',
			options: {},
			range: '',
			keyRow: 0,
			dataStartRow: 1,
		};
		ctx.getNodeParameter.mockImplementation(
			(name, _i, fallback) => (name in params ? params[name as string] : fallback) as never,
		);

		await execute.call(ctx, [{ json: {} }]);

		expect(microsoftApiRequest).toHaveBeenCalledWith(
			'GET',
			'/drive/items/WB/workbook/worksheets/a%2F..%2Fb/usedRange',
			{},
			{},
		);
	});
});
