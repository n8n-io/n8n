import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const task = {
	id: 'Nk1aTV9WUjE4c2t0YjlYdA',
	title: 'Prepare quarterly report',
	status: 'needsAction',
};

describe('Google Tasks Node - request URLs', () => {
	beforeAll(() => {
		const tasks = '/tasks/v1/lists/MTY1NjQ1NTg4NjY5NTE5ODU3NjI6MDow/tasks';

		nock('https://www.googleapis.com')
			.post(tasks)
			.reply(200, task)
			.get(`${tasks}/Nk1aTV9WUjE4c2t0YjlYdA`)
			.reply(200, task)
			.get(tasks)
			.query(true)
			.reply(200, { items: [task] })
			.patch(`${tasks}/Nk1aTV9WUjE4c2t0YjlYdA`, { status: 'completed' })
			.query(true)
			.reply(200, { ...task, status: 'completed' })
			.delete(`${tasks}/Nk1aTV9WUjE4c2t0YjlYdA`)
			.query(true)
			.reply(204);
	});

	afterAll(() => {
		expect(nock.pendingMocks()).toEqual([]);
	});

	new NodeTestHarness().setupTests({
		credentials: {
			googleTasksOAuth2Api: {
				scope: 'https://www.googleapis.com/auth/tasks',
				oauthTokenData: { access_token: 'test-access-token' },
			},
		},
		workflowFiles: ['tasks.workflow.json'],
	});
});
