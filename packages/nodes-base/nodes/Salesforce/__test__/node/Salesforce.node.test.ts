import nock from 'nock';

import { testWorkflows } from '@test/nodes/Helpers';

import taskDetails from './fixtures/task-details.json';
import taskSummary from './fixtures/task-summary.json';
import tasks from './fixtures/tasks.json';
import userDeltails from './fixtures/user-details.json';
import users from './fixtures/users.json';

describe('Salesforce Node', () => {
	nock.emitter.on('no match', (req) => {
		console.error('Unmatched request: ', req);
	});

	const salesforceNock = nock('https://salesforce.instance/services/data/v59.0');

	describe('users', () => {
		beforeAll(() => {
			salesforceNock
				.get('/query')
				.query({
					q: 'SELECT id,name,email FROM User ',
				})
				.reply(200, { records: users })
				.get('/sobjects/user/id1')
				.reply(200, userDeltails);
		});

		testWorkflows(['nodes/Salesforce/__test__/node/users.workflow.json']);

		it('should make the correct network calls', () => {
			salesforceNock.done();
		});
	});

	describe('tasks', () => {
		beforeAll(() => {
			salesforceNock
				.post('/sobjects/task', {
					Status: 'In Progress',
					Subject: 'Email',
					Description: 'Sample description',
				})
				.reply(200, { id: 'id1', success: true, errors: [] })
				.get('/query')
				.query({
					q: 'SELECT id,subject,status,priority FROM Task ',
				})
				.reply(200, { records: tasks })
				.get('/sobjects/task/id1')
				.reply(200, taskDetails)
				.get('/sobjects/task')
				.reply(200, taskSummary)
				.patch('/sobjects/task/id1', { Description: 'New description' })
				.reply(200, { success: true, errors: [] })
				.delete('/sobjects/task/id1')
				.reply(200, { success: true, errors: [] });
		});

		testWorkflows(['nodes/Salesforce/__test__/node/tasks.workflow.json']);

		it('should make the correct network calls', () => {
			salesforceNock.done();
		});
	});
});
