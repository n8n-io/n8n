import nock from 'nock';

import { getWorkflowFilenames, initBinaryDataService, testWorkflows } from '@test/nodes/Helpers';

const workflows = getWorkflowFilenames(__dirname);

describe('Test Github Node', () => {
	describe('Workflow Dispatch', () => {
		const now = 1683028800000;
		const owner = 'testOwner';
		const repository = 'testRepository';
		const workflowId = 147025216;
		const usersResponse = {
			total_count: 12,
			items: [
				{
					login: 'testOwner',
					id: 1,
				},
			],
		};
		const repositoriesResponse = {
			total_count: 40,
			items: [
				{
					id: 3081286,
					name: 'testRepository',
				},
			],
		};
		const workflowsResponse = {
			total_count: 2,
			workflows: [
				{
					id: workflowId,
					node_id: 'MDg6V29ya2Zsb3cxNjEzMzU=',
					name: 'CI',
					path: '.github/workflows/blank.yaml',
					state: 'active',
					created_at: '2020-01-08T23:48:37.000-08:00',
					updated_at: '2020-01-08T23:50:21.000-08:00',
					url: 'https://api.github.com/repos/octo-org/octo-repo/actions/workflows/161335',
					html_url: 'https://github.com/octo-org/octo-repo/blob/master/.github/workflows/161335',
					badge_url: 'https://github.com/octo-org/octo-repo/workflows/CI/badge.svg',
				},
				{
					id: 269289,
					node_id: 'MDE4OldvcmtmbG93IFNlY29uZGFyeTI2OTI4OQ==',
					name: 'Linter',
					path: '.github/workflows/linter.yaml',
					state: 'active',
					created_at: '2020-01-08T23:48:37.000-08:00',
					updated_at: '2020-01-08T23:50:21.000-08:00',
					url: 'https://api.github.com/repos/octo-org/octo-repo/actions/workflows/269289',
					html_url: 'https://github.com/octo-org/octo-repo/blob/master/.github/workflows/269289',
					badge_url: 'https://github.com/octo-org/octo-repo/workflows/Linter/badge.svg',
				},
			],
		};

		beforeAll(async () => {
			jest.useFakeTimers({ doNotFake: ['nextTick'], now });
			await initBinaryDataService();
		});

		beforeEach(async () => {
			const baseUrl = 'https://api.github.com';
			nock(baseUrl)
				.persist()
				.defaultReplyHeaders({ 'Content-Type': 'application/json' })
				.get('/search/users')
				.query(true)
				.reply(200, usersResponse)
				.get('/search/repositories')
				.query(true)
				.reply(200, repositoriesResponse)
				.get(`/repos/${owner}/${repository}/actions/workflows`)
				.reply(200, workflowsResponse)
				.post(`/repos/${owner}/${repository}/actions/workflows/${workflowId}/dispatches`, {
					ref: 'main',
					inputs: {},
				})
				.reply(200, {});
		});

		testWorkflows(workflows);
	});
});
