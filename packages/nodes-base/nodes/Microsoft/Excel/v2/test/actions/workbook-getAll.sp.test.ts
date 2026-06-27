import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { execute } from '../../actions/workbook/getAll.operation';

// workbook:getAll lists workbooks via a drive search (/drive/root/search), which Microsoft
// Graph does not support app-only. Under the Service Principal credential the operation must
// fail fast with a clear message (steering to By-ID / OAuth2) rather than issue a request
// that errors at runtime — mirroring the OneDrive reference, which blocks search under SP.
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
		// getExcelCredentialType reads authentication (the only param read before the guard)
		ctx.getNodeParameter.mockReturnValue('microsoftEntraServicePrincipalApi');
		ctx.getNode.mockReturnValue(mockNode);
		ctx.continueOnFail.mockReturnValue(false);

		// The guard is the first statement in the operation, so it throws before any Graph
		// request is built (getExcelCredentialType only reads the `authentication` param).
		await expect(execute.call(ctx, [{ json: {} }])).rejects.toThrow(
			'Search is not supported with the Service Principal credential',
		);
	});
});
