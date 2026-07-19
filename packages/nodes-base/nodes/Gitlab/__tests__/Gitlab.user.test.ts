import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import type { WorkflowTestData } from 'n8n-workflow';
import nock from 'nock';

describe('Gitlab Node - User Operations', () => {
	const credentials = {
		gitlabApi: {
			accessToken: 'test-token',
			server: 'https://gitlab.com',
		},
	};

	beforeAll(() => {
		nock.disableNetConnect();
	});

	afterAll(() => {
		nock.restore();
	});

	afterEach(() => {
		nock.cleanAll();
	});

	describe('user:getRepositories with returnAll=true', () => {
		beforeAll(() => {
			const mock = nock('https://gitlab.com/api/v4');
			mock
				.get('/users/test-owner/projects')
				.query(true)
				.reply(200, [
					{ id: 1, name: 'r1', path_with_namespace: 'test-owner/r1' },
					{ id: 2, name: 'r2', path_with_namespace: 'test-owner/r2' },
				]);
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['user.getRepositories.returnAll.workflow.json'],
		});
	});

	describe('user:getRepositories with returnAll=false', () => {
		beforeAll(() => {
			const mock = nock('https://gitlab.com/api/v4');
			mock
				.get('/users/test-owner/projects')
				.query(true)
				.reply(200, [{ id: 1, name: 'r1' }]);
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['user.getRepositories.limited.workflow.json'],
		});
	});

	describe('user:getRepositories with empty result', () => {
		beforeAll(() => {
			const mock = nock('https://gitlab.com/api/v4');
			mock.get('/users/test-owner/projects').query(true).reply(200, []);
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['user.getRepositories.empty.workflow.json'],
		});
	});

	describe('user:getRepositories with 404 error', () => {
		beforeEach(() => {
			const mock = nock('https://gitlab.com/api/v4');
			mock
				.get('/users/nonexistent-user/projects')
				.query(true)
				.reply(404, { message: '404 User Not Found' });
		});

		const harness = new NodeTestHarness();
		const workflowData = harness.readWorkflowJSON('user.getRepositories.error.workflow.json');
		const testData: WorkflowTestData = {
			description: 'user:getRepositories.error.workflow',
			input: { workflowData },
			output: { nodeData: {}, error: 'The resource you are requesting could not be found' },
			credentials,
		};
		harness.setupTest(testData, { credentials });
	});

	describe('user:getRepositories with 401 error', () => {
		beforeEach(() => {
			const mock = nock('https://gitlab.com/api/v4');
			mock
				.get('/users/nonexistent-user/projects')
				.query(true)
				.reply(401, { message: '401 Unauthorized' });
		});

		const harness = new NodeTestHarness();
		const workflowData = harness.readWorkflowJSON('user.getRepositories.error.workflow.json');
		const testData: WorkflowTestData = {
			description: 'user:getRepositories.error.workflow',
			input: { workflowData },
			output: { nodeData: {}, error: 'Authorization failed - please check your credentials' },
			credentials,
		};
		harness.setupTest(testData, { credentials });
	});

	describe('user:getRepositories with continueOnFail=true', () => {
		beforeAll(() => {
			const mock = nock('https://gitlab.com/api/v4');
			mock
				.get('/users/test-owner/projects')
				.query(true)
				.reply(500, { message: 'The service was not able to process your request' });
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['user.getRepositories.continueOnFail.workflow.json'],
		});
	});

	describe('user:getRepositories does not read repository parameter', () => {
		beforeAll(() => {
			const mock = nock('https://gitlab.com/api/v4');
			mock
				.get('/users/test-owner/projects')
				.query(true)
				.reply(200, [{ id: 1, name: 'r1', path_with_namespace: 'test-owner/r1' }]);
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['user.getRepositories.noRepoParam.workflow.json'],
		});
	});
});
