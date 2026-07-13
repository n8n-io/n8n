import { versionDescription } from '../../v2/MicrosoftSharePointV2.node';

describe('Microsoft SharePoint v2 authentication selector', () => {
	const properties = versionDescription.properties;
	const credentials = versionDescription.credentials ?? [];
	const authProperty = properties.find((property) => property.name === 'authentication');
	const optionValues = (authProperty?.options ?? []).map((option) =>
		'value' in option ? option.value : undefined,
	);

	it('should expose an authentication options selector as the first property', () => {
		expect(authProperty).toBeDefined();
		expect(authProperty?.type).toBe('options');
		expect(authProperty?.noDataExpression).toBe(true);
		expect(properties[0]?.name).toBe('authentication');
	});

	it('should offer exactly the generic Microsoft and Service Principal credentials', () => {
		expect(optionValues).toEqual(['microsoftOAuth2Api', 'microsoftEntraServicePrincipalApi']);
	});

	it('should default to the generic Microsoft credential', () => {
		expect(authProperty?.default).toBe('microsoftOAuth2Api');
	});

	it('should gate each credential behind its matching authentication value', () => {
		expect(credentials).toHaveLength(2);
		for (const credential of credentials) {
			expect(credential.required).toBe(true);
			expect(credential.displayOptions?.show?.authentication).toEqual([credential.name]);
		}
	});

	it('should not offer the legacy SharePoint credential', () => {
		const credentialNames = credentials.map((credential) => credential.name);

		expect(optionValues).not.toContain('microsoftSharePointOAuth2Api');
		expect(credentialNames).not.toContain('microsoftSharePointOAuth2Api');
	});

	it('should keep the default aligned with a gated credential', () => {
		const credentialGatedByDefault = credentials.find((credential) =>
			credential.displayOptions?.show?.authentication?.includes(authProperty?.default as string),
		);

		expect(credentialGatedByDefault?.name).toBe('microsoftOAuth2Api');
	});
});
