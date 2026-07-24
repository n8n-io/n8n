import { MicrosoftExcel } from '../../Excel/MicrosoftExcel.node';
import { MicrosoftExcelSharePoint } from '../MicrosoftExcelSharePoint.node';

describe('MicrosoftExcelSharePoint', () => {
	const node = new MicrosoftExcelSharePoint();

	it('should be visible in the nodes panel', () => {
		// `hidden` is the flag the editor's visibleNodeTypes filters on
		expect(node.description.hidden).toBeUndefined();
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

	it('should be exposed as an AI tool', () => {
		expect(node.description.version).toBe(1);
		expect(node.description.usableAsTool).toBe(true);
	});

	it('describes every operation for a model choosing between tools', () => {
		const operationProperties = node.description.properties.filter(
			(property) => property.name === 'operation',
		);

		expect(operationProperties.length).toBeGreaterThan(0);
		for (const property of operationProperties) {
			for (const option of property.options ?? []) {
				if (!('value' in option)) continue;
				expect(option.description, `operation ${String(option.value)}`).toMatch(/\w+/);
				expect(
					(option as { action?: string }).action,
					`operation ${String(option.value)} action`,
				).toMatch(/\w+/);
			}
		}
	});
});
