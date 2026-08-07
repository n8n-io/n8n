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

describe('Gitlab Node - Repository Operations', () => {
	beforeAll(() => {
		nock.disableNetConnect();
	});

	afterAll(() => {
		nock.restore();
	});

	afterEach(() => {
		nock.cleanAll();
	});

	describe('repository:get', () => {
		beforeAll(() => {
			api().get('/projects/test-owner%2Ftest-repo').query(true).reply(200, {
				id: 1,
				name: 'test-repo',
				path_with_namespace: 'test-owner/test-repo',
				default_branch: 'main',
				visibility: 'private',
			});
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['repository.get.workflow.json'],
		});
	});

	describe('repository:get with a missing project', () => {
		beforeEach(() => {
			api()
				.get('/projects/missing%2Fnope')
				.query(true)
				.reply(404, { message: '404 Project Not Found' });
		});

		const harness = new NodeTestHarness();
		const workflowData = harness.readWorkflowJSON('repository.get.error.workflow.json');
		const testData: WorkflowTestData = {
			description: 'repository:get.error.workflow',
			input: { workflowData },
			output: {
				nodeData: {},
				error: 'The resource you are requesting could not be found',
			},
			credentials,
		};
		harness.setupTest(testData, { credentials });
	});

	describe('repository:get with invalid credentials', () => {
		beforeEach(() => {
			api().get('/projects/missing%2Fnope').query(true).reply(401, { message: '401 Unauthorized' });
		});

		const harness = new NodeTestHarness();
		const workflowData = harness.readWorkflowJSON('repository.get.error.workflow.json');
		const testData: WorkflowTestData = {
			description: 'repository:get.error.workflow',
			input: { workflowData },
			output: {
				nodeData: {},
				error: 'Authorization failed - please check your credentials',
			},
			credentials,
		};
		harness.setupTest(testData, { credentials });
	});

	describe('repository:getIssues', () => {
		describe('with returnAll=true', () => {
			beforeAll(() => {
				api()
					.get('/projects/test-owner%2Ftest-repo/issues')
					.query(true)
					.reply(200, [
						{ iid: 1, title: 'Issue 1', state: 'opened' },
						{ iid: 2, title: 'Issue 2', state: 'closed' },
					]);
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['repository.getIssues.returnAll.workflow.json'],
			});
		});

		describe('with returnAll=false', () => {
			beforeAll(() => {
				api()
					.get('/projects/test-owner%2Ftest-repo/issues')
					.query({ state: 'opened', per_page: 5 })
					.reply(200, [{ iid: 1 }]);
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['repository.getIssues.limited.workflow.json'],
			});
		});

		describe('with filters and no results', () => {
			beforeAll(() => {
				api().get('/projects/test-owner%2Ftest-repo/issues').query(true).reply(200, []);
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['repository.getIssues.filters.workflow.json'],
			});
		});

		describe('with an empty result', () => {
			beforeAll(() => {
				api().get('/projects/test-owner%2Ftest-repo/issues').query(true).reply(200, []);
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['repository.getIssues.empty.workflow.json'],
			});
		});

		describe('with a missing project', () => {
			beforeEach(() => {
				api()
					.get('/projects/missing%2Fnope/issues')
					.query(true)
					.reply(404, { message: '404 Project Not Found' });
			});

			const harness = new NodeTestHarness();
			const workflowData = harness.readWorkflowJSON('repository.getIssues.404.workflow.json');
			const testData: WorkflowTestData = {
				description: 'repository:getIssues.404.workflow',
				input: { workflowData },
				output: {
					nodeData: {},
					error: 'The resource you are requesting could not be found',
				},
				credentials,
			};
			harness.setupTest(testData, { credentials });
		});
	});

	describe('repository:get with continueOnFail=true', () => {
		beforeAll(() => {
			api()
				.get('/projects/test-owner%2Ftest-repo')
				.query(true)
				.reply(500, { message: '500 Internal Server Error' });
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['repository.get.continueOnFail.workflow.json'],
		});
	});
});
