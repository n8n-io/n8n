import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test Github Node - Dispatch and Wait', () => {
	describe('Workflow Dispatch and Wait', () => {
		const now = 1683028800000;
		const owner = 'Owner';
		const repository = 'test-github-actions';
		const workflowId = 145370278;
		const ref = 'test-branch';

		const usersResponse = {
			total_count: 1,
			items: [
				{
					login: owner,
					id: 1,
				},
			],
		};

		const repositoriesResponse = {
			total_count: 1,
			items: [
				{
					id: 3081286,
					name: repository,
				},
			],
		};

		const workflowsResponse = {
			total_count: 1,
			workflows: [
				{
					id: workflowId,
					node_id: 'MDg6V29ya2Zsb3cxNjEzMzU=',
					name: 'New Test Workflow',
					path: '.github/workflows/test.yaml',
					state: 'active',
					created_at: '2020-01-08T23:48:37.000-08:00',
					updated_at: '2020-01-08T23:50:21.000-08:00',
					url: `https://api.github.com/repos/${owner}/${repository}/actions/workflows/${workflowId}`,
					html_url: `https://github.com/${owner}/${repository}/blob/master/.github/workflows/test.yaml`,
					badge_url: `https://github.com/${owner}/${repository}/workflows/New%20Test%20Workflow/badge.svg`,
				},
			],
		};

		const refsResponse = [{ ref: `refs/heads/${ref}` }];

		beforeAll(async () => {
			jest.useFakeTimers({ doNotFake: ['nextTick'], now });
		});

		beforeEach(async () => {
			const baseUrl = 'https://api.github.com';
			nock.cleanAll();
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
				.get(`/repos/${owner}/${repository}/git/refs`)
				.reply(200, refsResponse)
				.post(
					`/repos/${owner}/${repository}/actions/workflows/${workflowId}/dispatches`,
					(body) => {
						return body.ref === ref && body.inputs?.resumeUrl;
					},
				)
				.reply(200, {});
		});

		afterEach(() => {
			nock.cleanAll();
		});

		new NodeTestHarness().setupTests({
			workflowFiles: ['GithubDispatchAndWaitWorkflow.json'],
		});
	});
});
