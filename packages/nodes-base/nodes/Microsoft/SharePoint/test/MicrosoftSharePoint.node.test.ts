import { MicrosoftSharePoint } from '../MicrosoftSharePoint.node';

describe('MicrosoftSharePoint (versioned root)', () => {
	afterEach(() => {
		delete process.env.N8N_MICROSOFT_SHAREPOINT_V2;
	});

	it('should register only version 1 by default, with version 1 as the default', () => {
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

	it('should register the blank version 2 only when N8N_MICROSOFT_SHAREPOINT_V2 is set', () => {
		process.env.N8N_MICROSOFT_SHAREPOINT_V2 = 'true';
		const node = new MicrosoftSharePoint();

		expect(node.description.defaultVersion).toBe(1);
		expect(Object.keys(node.nodeVersions)).toEqual(['1', '2']);

		const v2 = node.nodeVersions[2];
		expect(v2.description.version).toBe(2);
		expect(v2.description.properties).toHaveLength(0);
		expect(v2.description.credentials).toBeUndefined();
		expect(v2.description.usableAsTool).toBeUndefined();
	});
});
