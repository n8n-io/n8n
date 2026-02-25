import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test MicrosoftGraphSecurity, secureScore => get', () => {
	const credentials = {
		microsoftGraphSecurityOAuth2Api: {
			oauthTokenData: {
				access_token: 'test-access-token',
			},
		},
	};

	beforeAll(() => {
		nock('https://graph.microsoft.com')
			.get('/v1.0/security/secureScores/test-secure-score-id')
			.matchHeader('Authorization', 'Bearer test-access-token')
			.reply(200, {
				'@odata.context':
					'https://graph.microsoft.com/v1.0/$metadata#security/secureScores/$entity',
				id: 'test-secure-score-id',
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
			});
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['secureScore.get.workflow.json'],
	});
});
