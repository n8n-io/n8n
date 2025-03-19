import { GSuiteAdminOAuth2Api } from '../../../../../credentials/GSuiteAdminOAuth2Api.credentials';

describe('GSuite Admin OAuth2 API Credentials', () => {
	const gSuiteAdminOAuth2Api = new GSuiteAdminOAuth2Api();

	it('should extend googleOAuth2Api', () => {
		expect(gSuiteAdminOAuth2Api.extends).toContain('googleOAuth2Api');
	});

	it('should have the correct scope property', () => {
		const scopeProperty = gSuiteAdminOAuth2Api.properties.find((prop) => prop.name === 'scope');
		expect(scopeProperty).toBeDefined();
		expect(scopeProperty?.type).toBe('hidden');
		expect(scopeProperty?.default).toBe(
			[
				'https://www.googleapis.com/auth/admin.directory.group',
				'https://www.googleapis.com/auth/admin.directory.user',
				'https://www.googleapis.com/auth/admin.directory.domain.readonly',
				'https://www.googleapis.com/auth/admin.directory.userschema.readonly',
				'https://www.googleapis.com/auth/admin.directory.device.chromeos',
				'https://www.googleapis.com/auth/admin.directory.orgunit.readonly',
			].join(' '),
		);
	});
});
