import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import type { WorkflowTestData } from 'n8n-workflow';
import nock from 'nock';

const credentials = {
	gitlabApi: {
		accessToken: 'test-token',
		server: 'https://gitlab.com',
	},
};

const api = () => nock('https://gitlab.com/api/v4');

function setupErrorTest(workflowFile: string, error: string) {
	const harness = new NodeTestHarness();
	const workflowData = harness.readWorkflowJSON(workflowFile);
	const testData: WorkflowTestData = {
		description: workflowFile.replace('.json', ''),
		input: { workflowData },
		output: { nodeData: {}, error },
		credentials,
	};
	harness.setupTest(testData, { credentials });
}

describe('Gitlab Node - Issue Operations', () => {
	beforeAll(() => {
		nock.disableNetConnect();
	});

	afterAll(() => {
		nock.restore();
	});

	afterEach(() => {
		nock.cleanAll();
	});

	describe('issue:create', () => {
		describe('with all fields', () => {
			beforeAll(() => {
				api()
					.post('/projects/test-owner%2Ftest-repo/issues', {
						title: 'Found a bug',
						description: 'Steps to reproduce...',
						due_date: '2025-01-15',
						labels: 'bug,critical',
						assignee_ids: [42, 7],
					})
					.reply(200, {
						iid: 1,
						title: 'Found a bug',
						labels: ['bug', 'critical'],
						assignee_ids: [42, 7],
					});
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['issue.create.workflow.json'],
			});
		});

		describe('without labels or assignees', () => {
			beforeAll(() => {
				api()
					.post('/projects/test-owner%2Ftest-repo/issues', {
						title: 'Plain issue',
						description: '',
						due_date: '',
						labels: '',
						assignee_ids: [],
					})
					.reply(200, { iid: 2 });
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['issue.create.plain.workflow.json'],
			});
		});

		describe('with a validation error', () => {
			beforeEach(() => {
				api().post('/projects/missing%2Fnope/issues').reply(422, { message: 'title is missing' });
			});

			setupErrorTest(
				'issue.create.error.workflow.json',
				'Your request is invalid or could not be processed by the service',
			);
		});

		describe('with invalid credentials', () => {
			beforeEach(() => {
				api().post('/projects/missing%2Fnope/issues').reply(401, { message: '401 Unauthorized' });
			});

			setupErrorTest(
				'issue.create.error.workflow.json',
				'Authorization failed - please check your credentials',
			);
		});

		describe('with a missing project', () => {
			beforeEach(() => {
				api()
					.post('/projects/missing%2Fnope/issues')
					.reply(404, { message: '404 Project Not Found' });
			});

			setupErrorTest(
				'issue.create.error.workflow.json',
				'The resource you are requesting could not be found',
			);
		});
	});

	describe('issue:createComment', () => {
		describe('with a valid issue', () => {
			beforeAll(() => {
				api()
					.post('/projects/test-owner%2Ftest-repo/issues/12/notes', {
						body: 'Looks good to me!',
					})
					.reply(200, { id: 1, body: 'Looks good to me!' });
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['issue.createComment.workflow.json'],
			});
		});

		describe('with a missing issue', () => {
			beforeEach(() => {
				api()
					.post('/projects/test-owner%2Ftest-repo/issues/9999/notes')
					.reply(404, { message: '404 Not found' });
			});

			setupErrorTest(
				'issue.createComment.404.workflow.json',
				'The resource you are requesting could not be found',
			);
		});
	});

	describe('issue:edit', () => {
		describe('with multiple fields', () => {
			beforeAll(() => {
				api()
					.put('/projects/test-owner%2Ftest-repo/issues/7', {
						title: 'New title',
						description: 'New body',
						state: 'closed',
						due_date: '2025-02-01',
					})
					.reply(200, { iid: 7 });
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['issue.edit.workflow.json'],
			});
		});

		describe('with labels and assignees', () => {
			beforeAll(() => {
				api()
					.put('/projects/test-owner%2Ftest-repo/issues/7', {
						labels: 'bug,p1',
						assignee_ids: [1, 2],
					})
					.reply(200, { iid: 7 });
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['issue.edit.labels.workflow.json'],
			});
		});

		describe('with no fields', () => {
			beforeAll(() => {
				api().put('/projects/test-owner%2Ftest-repo/issues/7', {}).reply(200, { iid: 7 });
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['issue.edit.empty.workflow.json'],
			});
		});

		describe('with a missing issue', () => {
			beforeEach(() => {
				api()
					.put('/projects/test-owner%2Ftest-repo/issues/9999')
					.reply(404, { message: '404 Not found' });
			});

			setupErrorTest(
				'issue.edit.404.workflow.json',
				'The resource you are requesting could not be found',
			);
		});
	});

	describe('issue:get', () => {
		describe('with a valid issue', () => {
			beforeAll(() => {
				api()
					.get('/projects/test-owner%2Ftest-repo/issues/5')
					.query(true)
					.reply(200, { iid: 5, title: 'My issue', state: 'open' });
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['issue.get.workflow.json'],
			});
		});

		describe('with a server error', () => {
			beforeEach(() => {
				api()
					.get('/projects/test-owner%2Ftest-repo/issues/1')
					.query(true)
					.reply(500, { message: '500 Internal Server Error' });
			});

			setupErrorTest(
				'issue.get.500.workflow.json',
				'The service was not able to process your request',
			);
		});

		describe('with continueOnFail=true', () => {
			beforeAll(() => {
				api()
					.get('/projects/test-owner%2Ftest-repo/issues/1')
					.query(true)
					.reply(500, { message: '500 Internal Server Error' });
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['issue.get.continueOnFail.workflow.json'],
			});
		});
	});

	describe('issue:lock', () => {
		beforeEach(() => {
			api()
				.put('/projects/test-owner%2Ftest-repo/issues/3', { discussion_locked: true })
				.times(4)
				.reply(200, { iid: 3 });
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: [
				'issue.lock.off-topic.workflow.json',
				'issue.lock.too-heated.workflow.json',
				'issue.lock.resolved.workflow.json',
				'issue.lock.spam.workflow.json',
			],
		});
	});
});
