import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

describe('Test MicrosoftTeamsV2, chatMember => add', () => {
	// The body spec is deep-equal, so this also pins that omitting the History option
	// sends NO visibleHistoryStartDateTime at all.
	nock('https://graph.microsoft.com')
		.post('/v1.0/chats/19:ebed9ad42c904d6c83adf0db360053ec@thread.v2/members', {
			'@odata.type': '#microsoft.graph.aadUserConversationMember',
			'user@odata.bind':
				'https://graph.microsoft.com/v1.0/users/e76f456f-5c3f-4f1e-9d5e-4d8f0f6ab111',
			roles: ['owner'],
		})
		.reply(201);

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['add.workflow.json'],
	});
});
