import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

describe('Test MicrosoftTeamsV2, chatMessage => undoSoftDeleteMessage', () => {
	nock('https://graph.microsoft.com')
		.get('/v1.0/me')
		.query({ $select: 'id' })
		.reply(200, { id: '11111-2222-3333' })
		.post(
			'/v1.0/users/11111-2222-3333/chats/19:ebed9ad42c904d6c83adf0db360053ec@thread.v2/messages/1698378560692/undoSoftDelete',
		)
		.reply(204);

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['undoSoftDeleteMessage.workflow.json'],
	});
});
