import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

describe('Test MicrosoftTeamsV2, task => update', () => {
	nock('https://graph.microsoft.com')
		.get('/v1.0/planner/tasks/lDrRJ7N_-06p_26iKBtJ6ZgAKffD')
		.reply(200, { '@odata.etag': 'W/"JzEtVGFzayAgQEBAQEBAQEBAQEBAQEBARCc="' })
		.patch('/v1.0/planner/tasks/lDrRJ7N_-06p_26iKBtJ6ZgAKffD', {
			dueDateTime: '2023-10-24T21:00:00.000Z',
			percentComplete: 78,
			title: 'do that',
		})
		.matchHeader('If-Match', 'W/"JzEtVGFzayAgQEBAQEBAQEBAQEBAQEBARCc="')
		.reply(200);

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['update.workflow.json'],
	});
});
