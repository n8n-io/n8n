import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test MicrosoftGraphSecurity, secureScoreControlProfile => getAll', () => {
	const credentials = {
		microsoftGraphSecurityOAuth2Api: {
			oauthTokenData: {
				access_token: 'test-access-token',
			},
		},
	};

	beforeAll(() => {
		nock('https://graph.microsoft.com')
			.get('/v1.0/security/secureScoreControlProfiles')
			.matchHeader('Authorization', 'Bearer test-access-token')
			.reply(200, {
				'@odata.context':
					'https://graph.microsoft.com/v1.0/$metadata#security/secureScoreControlProfiles',
				value: [
					{
						id: 'test-control-profile-1',
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
						actionUrl:
							'https://portal.azure.com/#blade/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/MFA',
						controlStateUpdates: [],
						vendorInformation: {
							provider: 'Microsoft',
							vendor: 'Microsoft',
						},
					},
					{
						id: 'test-control-profile-2',
						azureTenantId: 'tenant-456',
						controlName: 'Enable conditional access',
						controlCategory: 'Identity',
						actionType: 'Config',
						service: 'AAD',
						maxScore: 15,
						tier: 'Core',
						userImpact: 'Medium',
						implementationCost: 'Medium',
						rank: 2,
						threats: ['Account Breach', 'Data Exfiltration'],
						deprecated: false,
						remediation: 'Configure conditional access policies',
						remediationImpact: 'Users may need to authenticate differently based on location',
						actionUrl:
							'https://portal.azure.com/#blade/Microsoft_AAD_ConditionalAccess/ConditionalAccessBlade',
						controlStateUpdates: [],
						vendorInformation: {
							provider: 'Microsoft',
							vendor: 'Microsoft',
						},
					},
				],
			});
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['secureScoreControlProfile.getAll.workflow.json'],
	});
});
