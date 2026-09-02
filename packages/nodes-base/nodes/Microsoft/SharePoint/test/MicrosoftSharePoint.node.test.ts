import { MicrosoftSharePoint } from '../MicrosoftSharePoint.node';
import { versionDescription } from '../v2/actions/versionDescription';

describe('MicrosoftSharePoint (versioned root)', () => {
	it('should register only version 1, with version 1 as the default', () => {
		const node = new MicrosoftSharePoint();

		expect(node.description.defaultVersion).toBe(1);
		expect(Object.keys(node.nodeVersions)).toEqual(['1']);

		const v1 = node.nodeVersions[1];
		expect(v1.description.version).toBe(1);
		expect(v1.description.properties).not.toHaveLength(0);
		expect(v1.description.credentials).toEqual([
			{ name: 'microsoftSharePointOAuth2Api', required: true },
		]);
		expect(v1.description.usableAsTool).toBe(true);
		expect(v1.methods?.listSearch).toBeDefined();
		expect(v1.methods?.resourceMapping).toBeDefined();
	});

	it('should not register the under-construction version 2', () => {
		const node = new MicrosoftSharePoint();

		expect(Object.keys(node.nodeVersions)).toEqual(['1']);
	});

	it('should expose version 2 as an AI tool once registered', () => {
		expect(versionDescription.usableAsTool).toBe(true);
	});

	it('describes every version 2 operation for a model choosing between tools', () => {
		const operationProperties = versionDescription.properties.filter(
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
