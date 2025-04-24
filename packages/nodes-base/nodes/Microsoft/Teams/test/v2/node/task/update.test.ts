import nock from 'nock';

import { testWorkflows } from '@test/nodes/Helpers';

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

	const workflows = ['nodes/Microsoft/Teams/test/v2/node/task/update.workflow.json'];
	testWorkflows(workflows, credentials);
});
