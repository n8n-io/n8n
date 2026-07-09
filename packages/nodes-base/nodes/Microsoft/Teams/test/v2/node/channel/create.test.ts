import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

describe('Test MicrosoftTeamsV2, channel => create', () => {
	nock('https://graph.microsoft.com')
		.post('/v1.0/teams/1644e7fe-547e-4223-a24f-922395865343/channels')
		.reply(200, {
			'@odata.context':
				"https://graph.microsoft.com/v1.0/$metadata#teams('1644e7fe-547e-4223-a24f-922395865343')/channels/$entity",
			id: '19:16259efabba44a66916d91dd91862a6f@thread.tacv2',
			createdDateTime: '2023-10-26T05:37:43.4798824Z',
			displayName: 'New Channel',
			description: 'new channel description',
			isFavoriteByDefault: null,
			email: '',
			webUrl:
				'https://teams.microsoft.com/l/channel/19%3a16259efabba44a66916d91dd91862a6f%40thread.tacv2/New+Channel?groupId=1644e7fe-547e-4223-a24f-922395865343&tenantId=tenantId-111-222-333',
			membershipType: 'private',
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['create.workflow.json'],
	});
});
