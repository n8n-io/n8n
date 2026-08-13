// Credential fixtures for the Microsoft To Do harness (workflow) tests. The
// NodeTestHarness preAuthentication is a no-op, so the Service Principal token POST never
// fires — the credential's `authenticate` attaches `Bearer <accessToken>` straight from
// this fixture. Supply `accessToken` directly and nock only the scoped Graph endpoint
// (with the Bearer header), never login.microsoftonline.com.
export const credentials = {
	microsoftEntraServicePrincipalApi: {
		accessToken: 'test-access-token',
		authentication: 'clientSecret',
		tenantId: '11111111-1111-1111-1111-111111111111',
		clientId: '22222222-2222-2222-2222-222222222222',
		clientSecret: 'test-client-secret',
		graphApiBaseUrl: 'https://graph.microsoft.com',
	},
};
