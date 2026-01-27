import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Github Node - Organization getMembers', () => {
	const credentials = {
		githubApi: {
			accessToken: 'test-token',
			server: 'https://api.github.com',
			user: 'testuser',
		},
	};

	describe('Basic getMembers Operation', () => {
		beforeAll(() => {
			const mock = nock('https://api.github.com');

			mock
				.get('/orgs/testorg/members')
				.query(true)
				.reply(200, [
					{
						login: 'octocat',
						id: 1,
						node_id: 'MDQ6VXNlcjE=',
						avatar_url: 'https://github.com/images/error/octocat_happy.gif',
						gravatar_id: '',
						url: 'https://api.github.com/users/octocat',
						html_url: 'https://github.com/octocat',
						followers_url: 'https://api.github.com/users/octocat/followers',
						following_url: 'https://api.github.com/users/octocat/following',
						gists_url: 'https://api.github.com/users/octocat/gists',
						starred_url: 'https://api.github.com/users/octocat/starred',
						subscriptions_url: 'https://api.github.com/users/octocat/subscriptions',
						organizations_url: 'https://api.github.com/users/octocat/orgs',
						repos_url: 'https://api.github.com/users/octocat/repos',
						events_url: 'https://api.github.com/users/octocat/events',
						received_events_url: 'https://api.github.com/users/octocat/received_events',
						type: 'User',
						site_admin: false,
					},
					{
						login: 'testuser',
						id: 2,
						node_id: 'MDQ6VXNlcjI=',
						avatar_url: 'https://github.com/images/error/testuser.gif',
						gravatar_id: '',
						url: 'https://api.github.com/users/testuser',
						html_url: 'https://github.com/testuser',
						followers_url: 'https://api.github.com/users/testuser/followers',
						following_url: 'https://api.github.com/users/testuser/following',
						gists_url: 'https://api.github.com/users/testuser/gists',
						starred_url: 'https://api.github.com/users/testuser/starred',
						subscriptions_url: 'https://api.github.com/users/testuser/subscriptions',
						organizations_url: 'https://api.github.com/users/testuser/orgs',
						repos_url: 'https://api.github.com/users/testuser/repos',
						events_url: 'https://api.github.com/users/testuser/events',
						received_events_url: 'https://api.github.com/users/testuser/received_events',
						type: 'User',
						site_admin: false,
					},
				]);
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['getMembers.workflow.json'],
		});
	});

	describe('Paginated getMembers Operation', () => {
		beforeAll(() => {
			const mock = nock('https://api.github.com');

			mock
				.get('/orgs/testorg/members')
				.query({ per_page: 1 })
				.reply(200, [
					{
						login: 'octocat',
						id: 1,
						node_id: 'MDQ6VXNlcjE=',
						avatar_url: 'https://github.com/images/error/octocat_happy.gif',
						gravatar_id: '',
						url: 'https://api.github.com/users/octocat',
						html_url: 'https://github.com/octocat',
						followers_url: 'https://api.github.com/users/octocat/followers',
						following_url: 'https://api.github.com/users/octocat/following',
						gists_url: 'https://api.github.com/users/octocat/gists',
						starred_url: 'https://api.github.com/users/octocat/starred',
						subscriptions_url: 'https://api.github.com/users/octocat/subscriptions',
						organizations_url: 'https://api.github.com/users/octocat/orgs',
						repos_url: 'https://api.github.com/users/octocat/repos',
						events_url: 'https://api.github.com/users/octocat/events',
						received_events_url: 'https://api.github.com/users/octocat/received_events',
						type: 'User',
						site_admin: false,
					},
				]);
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['getMembersLimit.workflow.json'],
		});
	});
});
