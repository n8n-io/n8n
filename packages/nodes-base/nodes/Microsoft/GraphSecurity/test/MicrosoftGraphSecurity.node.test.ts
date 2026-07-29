import { MicrosoftGraphSecurity } from '../MicrosoftGraphSecurity.node';

describe('MicrosoftGraphSecurity node description', () => {
	const node = new MicrosoftGraphSecurity();

	const authProp = node.description.properties.find((p) => p.name === 'authentication');
	const credentials = node.description.credentials ?? [];
	const legacyCred = credentials.find((c) => c.name === 'microsoftGraphSecurityOAuth2Api');
	const genericCred = credentials.find((c) => c.name === 'microsoftOAuth2Api');

	it('defaults authentication to the legacy gate value', () => {
		expect(authProp?.default).toBe('microsoftGraphSecurityOAuth2Api');
	});

	it('gates the legacy credential on exactly the authentication default', () => {
		// Reference the property default so the credential gate and the default cannot drift.
		expect(legacyCred?.displayOptions?.show?.authentication).toContain(authProp?.default);
	});

	it('gates the generic credential on microsoftOAuth2Api', () => {
		expect(genericCred?.displayOptions?.show?.authentication).toContain('microsoftOAuth2Api');
	});
});
