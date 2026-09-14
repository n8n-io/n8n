import { MicrosoftSharePoint } from '../MicrosoftSharePoint.node';
import { versionDescription } from '../v2/actions/versionDescription';

describe('MicrosoftSharePoint (versioned root)', () => {
	it('should register versions 1 and 2, with version 2 as the default', () => {
		const node = new MicrosoftSharePoint();

		expect(node.description.defaultVersion).toBe(2);
		expect(Object.keys(node.nodeVersions)).toEqual(['1', '2']);

		const v1 = node.nodeVersions[1];
		expect(v1.description.version).toBe(1);
		expect(v1.description.properties).not.toHaveLength(0);
		expect(v1.description.credentials).toEqual([
			{ name: 'microsoftSharePointOAuth2Api', required: true },
		]);
		expect(v1.description.usableAsTool).toBe(true);
		expect(v1.methods?.listSearch).toBeDefined();
		expect(v1.methods?.resourceMapping).toBeDefined();

		const v2 = node.nodeVersions[2];
		expect(v2.description.version).toBe(2);
		expect(v2.description.properties).not.toHaveLength(0);
		expect(v2.description.credentials?.map((credential) => credential.name)).toEqual([
			'microsoftOAuth2Api',
			'microsoftEntraServicePrincipalApi',
		]);
		expect(v2.methods?.listSearch).toBeDefined();
		expect(v2.methods?.resourceMapping).toBeDefined();
	});

	it('should trim the subdomain in the declarative base URL', () => {
		const node = new MicrosoftSharePoint();

		expect(node.nodeVersions[1].description.requestDefaults?.baseURL).toBe(
			'=https://{{ ($credentials.subdomain || "").trim() }}.sharepoint.com/_api/v2.0/',
		);
	});

	it('should expose the registered version 2 as an AI tool', () => {
		const node = new MicrosoftSharePoint();

		expect(node.nodeVersions[2].description.usableAsTool).toBe(true);
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
