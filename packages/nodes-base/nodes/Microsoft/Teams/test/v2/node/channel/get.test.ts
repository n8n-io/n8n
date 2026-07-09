import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

describe('Test MicrosoftTeamsV2, channel => get', () => {
	nock('https://graph.microsoft.com')
		.get(
			'/v1.0/teams/e25bae35-7bcc-4fb7-b4f2-0d5caef251fd/channels/19:dff84a49e5124cc89dff0192c621ea0f@thread.tacv2',
		)
		.reply(200, {
			'@odata.context':
				"https://graph.microsoft.com/v1.0/$metadata#teams('e25bae35-7bcc-4fb7-b4f2-0d5caef251fd')/channels/$entity",
			id: '19:dff84a49e5124cc89dff0192c621ea0f@thread.tacv2',
			createdDateTime: '2022-03-26T17:16:51Z',
			displayName: 'General',
			description: 'Description of Retail',
			isFavoriteByDefault: null,
			email: 'Retail@5w1hb7.onmicrosoft.com',
			tenantId: 'tenantId-111-222-333',
			webUrl:
				'https://teams.microsoft.com/l/channel/19%3Adff84a49e5124cc89dff0192c621ea0f%40thread.tacv2/General?groupId=e25bae35-7bcc-4fb7-b4f2-0d5caef251fd&tenantId=tenantId-111-222-333&allowXTenantAccess=True',
			membershipType: 'standard',
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['get.workflow.json'],
	});
});
