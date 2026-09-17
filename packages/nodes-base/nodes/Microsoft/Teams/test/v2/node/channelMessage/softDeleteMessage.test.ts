import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

describe('Test MicrosoftTeamsV2, channelMessage => softDeleteMessage', () => {
	nock('https://graph.microsoft.com')
		.post(
			'/v1.0/teams/1111-2222-3333/channels/42:aaabbbccc.tacv2/messages/1698324478896/softDelete',
		)
		.reply(204)
		.post(
			'/v1.0/teams/1111-2222-3333/channels/42:aaabbbccc.tacv2/messages/1698324478896/replies/1698378560692/softDelete',
		)
		.reply(204);

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: [
			'softDeleteMessage.workflow.json',
			'softDeleteMessage.reply.workflow.json',
			'softDeleteMessage.servicePrincipal.workflow.json',
		],
	});
});
