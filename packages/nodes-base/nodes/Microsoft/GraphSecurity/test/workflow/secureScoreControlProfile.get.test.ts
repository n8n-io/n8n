import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test MicrosoftGraphSecurity, secureScoreControlProfile => get', () => {
	const credentials = {
		microsoftGraphSecurityOAuth2Api: {
			oauthTokenData: {
				access_token: 'test-access-token',
			},
		},
	};

	beforeAll(() => {
		nock('https://graph.microsoft.com')
			.get('/v1.0/security/secureScoreControlProfiles/test-control-profile-id')
			.matchHeader('Authorization', 'Bearer test-access-token')
			.reply(200, {
				'@odata.context':
					'https://graph.microsoft.com/v1.0/$metadata#security/secureScoreControlProfiles/$entity',
				id: 'test-control-profile-id',
				azureTenantId: 'tenant-123',
				controlName: 'Enable multifactor authentication',
				controlCategory: 'Identity',
				actionType: 'Config',
				service: 'AAD',
				maxScore: 10,
				tier: 'Core',
				userImpact: 'Low',
				implementationCost: 'Low',
				rank: 1,
				threats: ['Account Breach', 'Credential Theft'],
				deprecated: false,
				remediation: 'Enable multi-factor authentication for all users',
				remediationImpact: 'Users will need to use an additional authentication method',
				actionUrl: 'https://portal.azure.com/#blade/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/MFA',
				controlStateUpdates: [],
				vendorInformation: {
					provider: 'Microsoft',
					vendor: 'Microsoft',
				},
			});
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['secureScoreControlProfile.get.workflow.json'],
	});
});
