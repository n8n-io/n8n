import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

describe('Test MicrosoftTeamsV2, channel => getAll', () => {
	nock('https://graph.microsoft.com')
		.get('/v1.0/teams/1111-2222-3333/channels')
		.reply(200, {
			value: [
				{
					id: '42:aaabbbccc.tacv2',
					createdDateTime: '2022-03-26T17:18:33Z',
					displayName: 'Sales West',
					description: 'Description of Sales West',
					isFavoriteByDefault: null,
					email: null,
					tenantId: 'tenantId-111-222-333',
					webUrl:
						'https://teams.microsoft.com/l/channel/threadId/Sales%20West?groupId=1111-2222-3333&tenantId=tenantId-111-222-333&allowXTenantAccess=False',
					membershipType: 'standard',
				},
				{
					id: '19:8662cdf2d8ff49eabdcf6364bc0fe3a2@thread.tacv2',
					createdDateTime: '2022-03-26T17:18:30Z',
					displayName: 'Sales East',
					description: 'Description of Sales West',
					isFavoriteByDefault: null,
					email: null,
					tenantId: 'tenantId-111-222-333',
					webUrl:
						'https://teams.microsoft.com/l/channel/19%3A8662cdf2d8ff49eabdcf6364bc0fe3a2%40thread.tacv2/Sales%20East?groupId=1111-2222-3333&tenantId=tenantId-111-222-333&allowXTenantAccess=False',
					membershipType: 'standard',
				},
				{
					id: '19:a95209ede91f4d5595ac944aeb172124@thread.tacv2',
					createdDateTime: '2022-03-26T17:18:16Z',
					displayName: 'General',
					description: 'Description of U.S. Sales',
					isFavoriteByDefault: null,
					email: 'U.S.Sales@5w1hb7.onmicrosoft.com',
					tenantId: 'tenantId-111-222-333',
					webUrl:
						'https://teams.microsoft.com/l/channel/19%3Aa95209ede91f4d5595ac944aeb172124%40thread.tacv2/U.S.%20Sales?groupId=1111-2222-3333&tenantId=tenantId-111-222-333&allowXTenantAccess=False',
					membershipType: 'standard',
				},
			],
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['getAll.workflow.json'],
	});
});
