import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { execute } from '../../actions/workbook/getAll.operation';

// workbook:getAll lists via a drive search, which Graph can't do app-only, so under SP it must
// fail fast (steering to By-ID / OAuth2) instead of erroring at runtime.
describe('Microsoft Excel workbook:getAll under the Service Principal credential', () => {
	const mockNode: INode = {
		id: 'test-node',
		name: 'Test Excel Node',
		type: 'n8n-nodes-base.microsoftExcel',
		typeVersion: 2,
		position: [0, 0],
		parameters: {},
	};

	it('throws "Search is not supported" instead of issuing a drive search', async () => {
		const ctx = mockDeep<IExecuteFunctions>();
		ctx.getNodeParameter.mockReturnValue('microsoftEntraServicePrincipalApi');
		ctx.getNode.mockReturnValue(mockNode);
		ctx.continueOnFail.mockReturnValue(false);

		// The guard is the operation's first statement, so it throws before any Graph request.
		await expect(execute.call(ctx, [{ json: {} }])).rejects.toThrow(
			'Search is not supported with the Service Principal credential',
		);
	});
});
