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

describe('Gitlab Node - Release Operations', () => {
	beforeAll(() => {
		nock.disableNetConnect();
	});

	afterAll(() => {
		nock.restore();
	});

	afterEach(() => {
		nock.cleanAll();
	});

	describe('release:create', () => {
		beforeAll(() => {
			api()
				.post('/projects/test-owner%2Ftest-repo/releases', {
					name: 'Version 1.0.0',
					description: 'First stable release',
					ref: 'main',
					tag_name: 'v1.0.0',
				})
				.reply(200, {
					tag_name: 'v1.0.0',
					name: 'Version 1.0.0',
					description: 'First stable release',
				});
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['release.create.workflow.json'],
		});
	});

	describe('release:create with only a tag', () => {
		beforeAll(() => {
			api()
				.post('/projects/test-owner%2Ftest-repo/releases', { tag_name: 'v0.1.0' })
				.reply(200, { tag_name: 'v0.1.0' });
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['release.create.tagOnly.workflow.json'],
		});
	});

	describe('release:create with a missing project', () => {
		beforeEach(() => {
			api()
				.post('/projects/missing%2Fnope/releases')
				.reply(404, { message: '404 Project Not Found' });
		});

		const harness = new NodeTestHarness();
		const workflowData = harness.readWorkflowJSON('release.create.404.workflow.json');
		const testData: WorkflowTestData = {
			description: 'release:create.404.workflow',
			input: { workflowData },
			output: {
				nodeData: {},
				error: 'The resource you are requesting could not be found',
			},
			credentials,
		};
		harness.setupTest(testData, { credentials });
	});

	describe('release:delete', () => {
		beforeAll(() => {
			api().delete('/projects/42/releases/v1.0.0').reply(200, {});
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['release.delete.workflow.json'],
		});
	});

	describe('release:delete with a missing release', () => {
		beforeEach(() => {
			api().delete('/projects/42/releases/v9.9.9').reply(404, { message: '404 Release Not Found' });
		});

		const harness = new NodeTestHarness();
		const workflowData = harness.readWorkflowJSON('release.delete.404.workflow.json');
		const testData: WorkflowTestData = {
			description: 'release:delete.404.workflow',
			input: { workflowData },
			output: {
				nodeData: {},
				error: 'The resource you are requesting could not be found',
			},
			credentials,
		};
		harness.setupTest(testData, { credentials });
	});

	describe('release:get', () => {
		beforeAll(() => {
			api()
				.get('/projects/42/releases/v1.0.0')
				.query(true)
				.reply(200, { tag_name: 'v1.0.0', name: 'Version 1.0.0', description: 'Notes' });
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['release.get.workflow.json'],
		});
	});

	describe('release:getAll', () => {
		describe('with returnAll=true', () => {
			beforeAll(() => {
				api()
					.get('/projects/1/releases')
					.query(true)
					.reply(200, [{ tag_name: 'v1.0.0' }, { tag_name: 'v1.0.1' }, { tag_name: 'v2.0.0' }]);
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['release.getAll.workflow.json'],
			});
		});

		describe('with returnAll=false', () => {
			beforeAll(() => {
				api()
					.get('/projects/1/releases')
					.query({ per_page: 5, order_by: 'created_at', sort: 'asc' })
					.reply(200, [{ tag_name: 'v1.0.0' }]);
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['release.getAll.limited.workflow.json'],
			});
		});
	});

	describe('release:update', () => {
		describe('with name and description', () => {
			beforeAll(() => {
				api()
					.put('/projects/42/releases/v1.0.0', {
						name: 'Version 1.0.0 - patched',
						description: 'Bug fix notes',
					})
					.reply(200, { tag_name: 'v1.0.0', name: 'Version 1.0.0 - patched' });
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['release.update.workflow.json'],
			});
		});

		describe('with milestones', () => {
			beforeAll(() => {
				api()
					.put('/projects/42/releases/v1.0.0', { milestones: ['m1', ' m2', ' m3'] })
					.reply(200, { tag_name: 'v1.0.0' });
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['release.update.milestones.workflow.json'],
			});
		});
	});

	describe('release:get with continueOnFail=true', () => {
		beforeAll(() => {
			api()
				.get('/projects/42/releases/v1.0.0')
				.query(true)
				.reply(500, { message: '500 Internal Server Error' });
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['release.get.continueOnFail.workflow.json'],
		});
	});
});
