import { MicrosoftExcelSharePoint } from '../MicrosoftExcelSharePoint.node';

describe('Microsoft Excel (SharePoint) authentication selector', () => {
	const { description } = new MicrosoftExcelSharePoint();
	const properties = description.properties;
	const credentials = description.credentials ?? [];
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

	it('should not offer the legacy SharePoint or Excel (OneDrive) credentials', () => {
		const credentialNames = credentials.map((credential) => credential.name);

		for (const legacyCredential of ['microsoftSharePointOAuth2Api', 'microsoftExcelOAuth2Api']) {
			expect(optionValues).not.toContain(legacyCredential);
			expect(credentialNames).not.toContain(legacyCredential);
		}
	});

	it('should keep the default aligned with a gated credential', () => {
		const credentialGatedByDefault = credentials.find((credential) =>
			credential.displayOptions?.show?.authentication?.includes(authProperty?.default as string),
		);

		expect(credentialGatedByDefault?.name).toBe('microsoftOAuth2Api');
	});
});
