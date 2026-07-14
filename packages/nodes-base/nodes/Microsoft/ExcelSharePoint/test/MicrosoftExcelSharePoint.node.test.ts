import type { IExecuteFunctions } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { MicrosoftExcelSharePoint } from '../MicrosoftExcelSharePoint.node';
import { MicrosoftExcel } from '../../Excel/MicrosoftExcel.node';

describe('MicrosoftExcelSharePoint (hidden shell)', () => {
	const node = new MicrosoftExcelSharePoint();

	it('should be hidden from the nodes panel', () => {
		// `hidden` is the flag the editor's visibleNodeTypes filters on
		expect(node.description.hidden).toBe(true);
	});

	it('should not collide with the OneDrive Excel node', () => {
		// Node registration is last-write-wins — a name clash would silently
		// shadow one node, so compare against the real sibling.
		const oneDriveNode = new MicrosoftExcel();

		expect(node.description.name).toBe('microsoftExcelSharePoint');
		expect(node.description.name).not.toBe(oneDriveNode.description.name);
		expect(node.description.displayName).toBe('Microsoft Excel (SharePoint)');
		expect(node.description.displayName).not.toBe(oneDriveNode.description.displayName);
	});

	it('should stay a shell — sign-in only, no operations or tool exposure', () => {
		expect(node.description.version).toBe(1);
		// Any property beyond the sign-in selector would silently no-op through
		// the pass-through execute; the first action ticket updates this bound.
		expect(node.description.properties).toHaveLength(1);
		expect(node.description.usableAsTool).toBeUndefined();
	});

	it('should pass input through unchanged when executed', async () => {
		const ctx = mock<IExecuteFunctions>();
		const items = [{ json: { a: 1 } }, { json: { b: 2 } }];
		ctx.getInputData.mockReturnValue(items);

		const result = await node.execute.call(ctx);

		expect(result).toEqual([items]);
	});
});
