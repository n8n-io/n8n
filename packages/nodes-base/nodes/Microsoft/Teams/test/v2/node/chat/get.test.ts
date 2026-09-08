import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

describe('Test MicrosoftTeamsV2, chat => get', () => {
	// Registered WITHOUT `.query(...)`, so adding an `$expand` or `$select` fails the test.
	// The workflow passes the chat id By ID and percent-encoded, the way the RLC hint tells
	// users to copy it out of a Teams URL; the decoded form below is what the node must
	// interpolate into the path.
	nock('https://graph.microsoft.com')
		.get('/v1.0/chats/19:ebed9ad42c904d6c83adf0db360053ec@thread.v2')
		.reply(200, {
			id: '19:ebed9ad42c904d6c83adf0db360053ec@thread.v2',
			topic: 'Release planning',
			createdDateTime: '2026-08-08T23:53:05.801Z',
			lastUpdatedDateTime: '2026-09-01T23:58:32.511Z',
			chatType: 'group',
			webUrl:
				'https://teams.microsoft.com/l/chat/19%3Aebed9ad42c904d6c83adf0db360053ec%40thread.v2/0?tenantId=23786ca6-7ff2-4672-87d0-5c649ee0a337',
			tenantId: '23786ca6-7ff2-4672-87d0-5c649ee0a337',
			onlineMeetingInfo: null,
		});

	new NodeTestHarness().setupTests({ credentials, workflowFiles: ['get.workflow.json'] });
});
