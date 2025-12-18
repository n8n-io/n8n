import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('TheHiveProject', () => {
	const credentials = {
		theHiveProjectApi: {
			url: 'https://thehive.example.com',
			apiKey: 'test-api-key',
		},
	};

	afterEach(() => {
		nock.cleanAll();
	});

	describe('Alert Operations', () => {
		describe('Create Alert', () => {
			beforeAll(() => {
				const mock = nock(credentials.theHiveProjectApi.url);

				// Mock create alert API call
				mock.post('/api/v1/alert').reply(201, {
					_id: '~alert123',
					_type: 'Alert',
					title: 'Test Alert',
					description: 'Test alert description',
					type: 'incident',
					severity: 2,
					status: 'New',
					tags: ['test', 'n8n'],
					source: 'n8n-test',
					sourceRef: 'test-ref-001',
					follow: true,
					createdAt: 1698753600000,
					updatedAt: 1698753600000,
				});

				// Mock load options queries that might be needed
				mock.post('/api/v1/query').query(true).reply(200, []);
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['alert-create.workflow.json'],
			});
		});

		describe('Get Alert', () => {
			beforeAll(() => {
				const mock = nock(credentials.theHiveProjectApi.url);

				// Mock get alert API call
				mock.get('/api/v1/alert/~123456').reply(200, {
					_id: '~123456',
					_type: 'Alert',
					title: 'Test Alert',
					description: 'Test alert description',
					type: 'incident',
					severity: 2,
					status: 'New',
					tags: ['test', 'n8n'],
					source: 'n8n-test',
					sourceRef: 'test-ref-001',
					follow: true,
					createdAt: 1698753600000,
					updatedAt: 1698753600000,
				});

				// Mock similar alerts query
				mock.post('/api/v1/query').reply(200, [
					{
						_id: '~alert456',
						title: 'Similar Alert',
					},
				]);

				// Mock alertSearch method for resource locator
				mock.post('/api/v1/query').query(true).reply(200, []);
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['alert-get.workflow.json'],
			});
		});

		describe('Search Alerts', () => {
			beforeAll(() => {
				const mock = nock(credentials.theHiveProjectApi.url);

				// Mock search alerts API call with expected query structure
				mock
					.post('/api/v1/query', (body) => {
						return body.query && Array.isArray(body.query);
					})
					.reply(200, [
						{
							_id: '~alert123',
							_type: 'Alert',
							title: 'Test Alert 1',
							status: 'New',
							severity: 2,
							createdAt: 1698753600000,
						},
						{
							_id: '~alert456',
							_type: 'Alert',
							title: 'Test Alert 2',
							status: 'New',
							severity: 1,
							createdAt: 1698753660000,
						},
					]);
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['alert-search.workflow.json'],
			});
		});
	});

	describe('Case Operations', () => {
		describe('Create Case', () => {
			beforeAll(() => {
				const mock = nock(credentials.theHiveProjectApi.url);

				// Mock create case API call
				mock.post('/api/v1/case').reply(201, {
					_id: '~123789',
					_type: 'Case',
					title: 'Test Case',
					description: 'Test case description',
					severity: 2,
					status: 'Open',
					tags: ['test', 'n8n'],
					tlp: 2,
					pap: 2,
					createdAt: 1698753600000,
					updatedAt: 1698753600000,
				});

				// Mock load options queries
				mock.post('/api/v1/query').query(true).reply(200, []);
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['case-create.workflow.json'],
			});
		});

		describe('Get Case', () => {
			beforeAll(() => {
				const mock = nock(credentials.theHiveProjectApi.url);

				// Mock get case API call (via query endpoint)
				mock
					.post('/api/v1/query', (body) => {
						return body.query && body.query[0] && body.query[0]._name === 'getCase';
					})
					.query(true)
					.reply(200, {
						_id: '~123789',
						_type: 'Case',
						title: 'Test Case',
						description: 'Test case description',
						severity: 2,
						status: 'Open',
						tags: ['test', 'n8n'],
						tlp: 2,
						pap: 2,
						createdAt: 1698753600000,
						updatedAt: 1698753600000,
					});

				// Mock caseSearch method for resource locator
				mock.post('/api/v1/query').query(true).reply(200, []);
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['case-get.workflow.json'],
			});
		});
	});

	describe('Observable Operations', () => {
		describe('Create Observable', () => {
			beforeAll(() => {
				const mock = nock(credentials.theHiveProjectApi.url);

				// Mock create observable API call
				mock.post('/api/v1/case/~123789/observable').reply(201, {
					_id: '~456789',
					_type: 'Observable',
					data: 'malicious.example.com',
					dataType: 'domain',
					message: 'Suspicious domain detected in analysis',
					tags: ['malware', 'suspicious'],
					tlp: 2,
					pap: 2,
					ioc: true,
					sighted: false,
					createdAt: 1698753600000,
					updatedAt: 1698753600000,
				});

				// Mock load options for observable types and other queries
				mock.post('/api/v1/query').query(true).reply(200, []);
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['observable-create.workflow.json'],
			});
		});
	});

	describe('Task Operations', () => {
		describe('Create Task', () => {
			beforeAll(() => {
				const mock = nock(credentials.theHiveProjectApi.url);

				// Mock create task API call
				mock.post('/api/v1/case/~123789/task').reply(201, {
					_id: '~654321',
					_type: 'Task',
					title: 'Test Task',
					description: 'Test task description',
					group: 'Investigation',
					status: 'Waiting',
					flag: false,
					mandatory: true,
					createdAt: 1698753600000,
					updatedAt: 1698753600000,
				});

				// Mock load options queries
				mock.post('/api/v1/query').query(true).reply(200, []);
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['task-create.workflow.json'],
			});
		});

		describe('Get Task', () => {
			beforeAll(() => {
				const mock = nock(credentials.theHiveProjectApi.url);

				// Mock get task API call (via query endpoint)
				mock
					.post('/api/v1/query', (body) => {
						return body.query && body.query[0] && body.query[0]._name === 'getTask';
					})
					.query(true)
					.reply(200, {
						_id: '~654321',
						_type: 'Task',
						title: 'Test Task',
						description: 'Test task description',
						group: 'Investigation',
						status: 'Waiting',
						flag: false,
						mandatory: true,
						createdAt: 1698753600000,
						updatedAt: 1698753600000,
					});

				// Mock taskSearch method for resource locator
				mock.post('/api/v1/query').query(true).reply(200, []);
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['task-get.workflow.json'],
			});
		});
	});

	describe('Comment Operations', () => {
		describe('Add Comment', () => {
			beforeAll(() => {
				const mock = nock(credentials.theHiveProjectApi.url);

				// Mock add comment API call
				mock.post('/api/v1/case/~123789/comment').reply(201, {
					_id: '~789123',
					_type: 'Comment',
					message: 'This is a test comment for the case',
					createdAt: 1698753600000,
					updatedAt: 1698753600000,
				});

				// Mock load options queries
				mock.post('/api/v1/query').query(true).reply(200, []);
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['comment-add.workflow.json'],
			});
		});
	});

	describe('Query Operations', () => {
		describe('Execute Query', () => {
			beforeAll(() => {
				const mock = nock(credentials.theHiveProjectApi.url);

				// Mock query execution API call
				mock
					.post('/api/v1/query', (body) => {
						return (
							body.query &&
							Array.isArray(body.query) &&
							body.query[0] &&
							body.query[0]._name === 'listOrganisation'
						);
					})
					.reply(200, [
						{
							_id: '~org123',
							_type: 'Organisation',
							name: 'Test Organization',
							description: 'Test organization description',
						},
					]);
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['query-execute.workflow.json'],
			});
		});
	});
});
