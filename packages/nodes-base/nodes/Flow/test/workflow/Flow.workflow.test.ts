import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const task = { id: 123, name: 'Write report', workspace_id: 42 };
const task2 = { id: 124, name: 'Review report', workspace_id: 42 };

describe('Flow > Workflows', () => {
	const credentials = {
		flowApi: {
			organizationId: 9,
			accessToken: 'fake-access-token',
		},
	};

	beforeAll(() => {
		const mock = nock('https://api.getflow.com/v2').matchHeader(
			'authorization',
			'Bearer fake-access-token',
		);
		mock
			.post('/tasks', { organization_id: 9, task: { workspace_id: 42, name: 'Write report' } })
			.reply(200, { task });
		mock
			.put('/tasks/123', { organization_id: 9, task: { workspace_id: 42, id: 123 } })
			.reply(200, { task });
		mock.get('/tasks/123').query({ organization_id: 9 }).reply(200, { task });
		mock
			.get('/tasks')
			.query({ organization_id: 9, limit: 2 })
			.reply(200, { tasks: [task] });
		mock
			.get('/tasks')
			.query({ organization_id: 9, limit: 100 })
			.reply(200, { tasks: [task] }, { link: 'https://api.getflow.com/v2/tasks?page=2' });
		mock
			.get('/tasks')
			.query({ page: 2, organization_id: 9, limit: 100 })
			.reply(200, { tasks: [task2] }, { link: '' });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.isDone()).toBe(true),
	});
});
