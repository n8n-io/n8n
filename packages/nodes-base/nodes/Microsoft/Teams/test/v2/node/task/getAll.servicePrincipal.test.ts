import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

// App-only (Service Principal) task:getAll. Under the SP credential the operation is
// forced to plan mode (no /me), so it must hit the exact plan-tasks path. The harness
// no-ops preAuthentication but calls authenticate (Bearer from the inline accessToken
// fixture) — nock ONLY the Graph endpoint, never login.microsoftonline.com.
describe('Test MicrosoftTeamsV2, task => getAll (Service Principal)', () => {
	nock('https://graph.microsoft.com')
		.get('/v1.0/planner/plans/coJdCqzqNUKULQtTRWDa6pgACTln/tasks')
		.reply(200, {
			value: [
				{
					'@odata.etag': 'W/"JzEtVGFzayAgQEBAQEBAQEBAQEBAQEBAZCc="',
					planId: 'coJdCqzqNUKULQtTRWDa6pgACTln',
					bucketId: null,
					title: 'tada',
					percentComplete: 10,
					id: '1KgwUqOmbU2C9mZWiqxiv5gAPp8Q',
				},
				{
					'@odata.etag': 'W/"JzEtVGFzayAgQEBAQEBAQEBAQEBAQEBAWCc="',
					planId: 'coJdCqzqNUKULQtTRWDa6pgACTln',
					bucketId: '2avE1BwPmEKp7Lxh0E-EmZgALF72',
					title: '1',
					percentComplete: 0,
					id: 'J3MLUgtmJ06YJgenyujiYpgANMF1',
				},
			],
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['getAll.servicePrincipal.workflow.json'],
	});
});
