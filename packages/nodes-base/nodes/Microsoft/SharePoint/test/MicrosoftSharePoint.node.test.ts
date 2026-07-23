import { MicrosoftSharePoint } from '../MicrosoftSharePoint.node';

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
});
