import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

describe('Test MicrosoftTeamsV2, task => deleteTask', () => {
	nock('https://graph.microsoft.com')
		.get('/v1.0/planner/tasks/lDrRJ7N_-06p_26iKBtJ6ZgAKffD')
		.reply(200, { '@odata.etag': 'W/"JzEtVGFzayAgQEBAQEBAQEBAQEBAQEBARCc="' })
		.delete('/v1.0/planner/tasks/lDrRJ7N_-06p_26iKBtJ6ZgAKffD')
		.matchHeader('If-Match', 'W/"JzEtVGFzayAgQEBAQEBAQEBAQEBAQEBARCc="')
		.reply(200, {});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['deleteTask.workflow.json'],
	});
});
