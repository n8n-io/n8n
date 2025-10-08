import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test MicrosoftGraphSecurity, secureScore => getAll', () => {
	const credentials = {
		microsoftGraphSecurityOAuth2Api: {
			oauthTokenData: {
				access_token: 'test-access-token',
			},
		},
	};

	beforeAll(() => {
		nock('https://graph.microsoft.com')
			.get('/v1.0/security/secureScores')
			.matchHeader('Authorization', 'Bearer test-access-token')
			.reply(200, {
				'@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#security/secureScores',
				value: [
					{
						id: 'test-secure-score-1',
						azureTenantId: 'tenant-123',
						activeUserCount: 100,
						createdDateTime: '2023-01-01T00:00:00Z',
						currentScore: 85,
						maxScore: 100,
						averageComparativeScores: [
							{
								basis: 'AllTenants',
								averageScore: 75.5,
							},
						],
						controlScores: [
							{
								controlName: 'Enable MFA',
								controlCategory: 'Identity',
								score: 10,
								maxScore: 10,
							},
						],
					},
					{
						id: 'test-secure-score-2',
						azureTenantId: 'tenant-456',
						activeUserCount: 200,
						createdDateTime: '2023-01-02T00:00:00Z',
						currentScore: 90,
						maxScore: 100,
						averageComparativeScores: [
							{
								basis: 'AllTenants',
								averageScore: 78.2,
							},
						],
						controlScores: [
							{
								controlName: 'Enable Conditional Access',
								controlCategory: 'Identity',
								score: 15,
								maxScore: 15,
							},
						],
					},
				],
			});
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['secureScore.getAll.workflow.json'],
	});
});
