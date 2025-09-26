import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

describe('Test MicrosoftTeamsV2, chat => create', () => {
	nock('https://graph.microsoft.com').post('/v1.0/chats').reply(201, {
		'@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#chats/$entity',
		id: '19:82fe7758-5bb3-4f0d-a43f-e555fd399c6f_8c0a1a67-50ce-4114-bb6c-da9c5dbcf6ca@unq.gbl.spaces',
		topic: null,
		createdDateTime: '2020-12-04T23:10:28.51Z',
		lastUpdatedDateTime: '2020-12-04T23:10:28.51Z',
		chatType: 'oneOnOne',
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['create.workflow.json'],
	});
});
