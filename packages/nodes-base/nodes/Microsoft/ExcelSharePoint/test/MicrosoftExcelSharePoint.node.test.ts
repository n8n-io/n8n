import { MicrosoftExcel } from '../../Excel/MicrosoftExcel.node';
import { MicrosoftExcelSharePoint } from '../MicrosoftExcelSharePoint.node';

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

	it('should not be exposed as an AI tool yet', () => {
		expect(node.description.version).toBe(1);
		expect(node.description.usableAsTool).toBeUndefined();
	});
});
