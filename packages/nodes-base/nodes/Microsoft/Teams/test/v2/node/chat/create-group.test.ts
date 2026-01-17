import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

describe('Test MicrosoftTeamsV2, chat => create group', () => {
	nock('https://graph.microsoft.com').post('/v1.0/chats').reply(201, {
		'@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#chats/$entity',
		id: '19:1c5b01696d2e4a179c292bc9cf04e63b@thread.v2',
		topic: 'Group chat title',
		createdDateTime: '2020-12-04T23:11:16.175Z',
		lastUpdatedDateTime: '2020-12-04T23:11:16.175Z',
		chatType: 'group',
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['create-group.workflow.json'],
	});
});
