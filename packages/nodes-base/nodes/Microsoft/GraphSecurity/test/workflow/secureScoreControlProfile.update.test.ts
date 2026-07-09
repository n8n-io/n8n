import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test MicrosoftGraphSecurity, secureScoreControlProfile => update', () => {
	const credentials = {
		microsoftGraphSecurityOAuth2Api: {
			oauthTokenData: {
				access_token: 'test-access-token',
			},
		},
	};

	beforeAll(() => {
		nock('https://graph.microsoft.com')
			.patch('/v1.0/security/secureScoreControlProfiles/test-control-profile-id', {
				vendorInformation: {
					provider: 'Microsoft',
					vendor: 'Microsoft',
				},
				state: 'Ignored',
			})
			.matchHeader('Authorization', 'Bearer test-access-token')
			.matchHeader('Prefer', 'return=representation')
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
				state: 'Ignored',
				vendorInformation: {
					provider: 'Microsoft',
					vendor: 'Microsoft',
				},
			});
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['secureScoreControlProfile.update.workflow.json'],
	});
});
