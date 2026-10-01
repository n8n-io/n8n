import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

// End-to-end wiring only: the operation has no RLC, so this pins that it still reaches the
// transport with the right query and that the limit slices the page. The clamp table itself
// lives in `getAll.clamp.test.ts`.
describe('Test MicrosoftTeamsV2, chat => getAll', () => {
	nock('https://graph.microsoft.com')
		.get('/v1.0/chats')
		.query({ $top: 1 })
		.reply(200, {
			value: [
				{
					id: '19:ebed9ad42c904d6c83adf0db360053ec@thread.v2',
					topic: 'Release planning',
					chatType: 'group',
					tenantId: '23786ca6-7ff2-4672-87d0-5c649ee0a337',
				},
				{
					id: '19:ff1e2d3c4b5a69788796a5b4c3d2e1f0@thread.v2',
					topic: null,
					chatType: 'oneOnOne',
					tenantId: '23786ca6-7ff2-4672-87d0-5c649ee0a337',
				},
			],
		});

	new NodeTestHarness().setupTests({ credentials, workflowFiles: ['getAll.workflow.json'] });
});
