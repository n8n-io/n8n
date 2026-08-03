import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Github Node - User getRepositories', () => {
	const credentials = {
		githubApi: {
			accessToken: 'test-token',
			server: 'https://api.github.com',
			user: 'testuser',
		},
	};

	describe('Basic User getRepositories Operation', () => {
		beforeAll(() => {
			const mock = nock('https://api.github.com');

			mock
				.get('/users/testuser/repos')
				.query(true)
				.reply(200, [
					{
						id: 1296269,
						name: 'hello-world',
						full_name: 'testuser/hello-world',
						owner: {
							login: 'testuser',
							id: 1,
							type: 'User',
						},
						private: false,
						html_url: 'https://github.com/testuser/hello-world',
						description: 'My first repository on GitHub!',
						fork: false,
						created_at: '2011-01-26T19:01:12Z',
						updated_at: '2011-01-26T19:14:43Z',
						pushed_at: '2011-01-26T19:06:43Z',
						clone_url: 'https://github.com/testuser/hello-world.git',
						size: 108,
						stargazers_count: 80,
						watchers_count: 9,
						language: 'C',
						forks_count: 9,
						archived: false,
						disabled: false,
						open_issues_count: 0,
						license: {
							key: 'mit',
							name: 'MIT License',
						},
						visibility: 'public',
						default_branch: 'master',
					},
					{
						id: 1296270,
						name: 'my-app',
						full_name: 'testuser/my-app',
						owner: {
							login: 'testuser',
							id: 1,
							type: 'User',
						},
						private: false,
						html_url: 'https://github.com/testuser/my-app',
						description: 'My awesome application',
						fork: false,
						created_at: '2011-02-26T19:01:12Z',
						updated_at: '2011-02-26T19:14:43Z',
						pushed_at: '2011-02-26T19:06:43Z',
						clone_url: 'https://github.com/testuser/my-app.git',
						size: 512,
						stargazers_count: 156,
						watchers_count: 45,
						language: 'JavaScript',
						forks_count: 23,
						archived: false,
						disabled: false,
						open_issues_count: 5,
						license: {
							key: 'apache-2.0',
							name: 'Apache License 2.0',
						},
						visibility: 'public',
						default_branch: 'main',
					},
				]);
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['getUserRepositories.workflow.json'],
		});
	});

	describe('Limited User getRepositories Operation', () => {
		beforeAll(() => {
			const mock = nock('https://api.github.com');

			mock
				.get('/users/testuser/repos')
				.query({ per_page: 1 })
				.reply(200, [
					{
						id: 1296269,
						name: 'hello-world',
						full_name: 'testuser/hello-world',
						owner: {
							login: 'testuser',
							id: 1,
							type: 'User',
						},
						private: false,
						html_url: 'https://github.com/testuser/hello-world',
						description: 'My first repository on GitHub!',
						fork: false,
						created_at: '2011-01-26T19:01:12Z',
						updated_at: '2011-01-26T19:14:43Z',
						pushed_at: '2011-01-26T19:06:43Z',
						clone_url: 'https://github.com/testuser/hello-world.git',
						size: 108,
						stargazers_count: 80,
						watchers_count: 9,
						language: 'C',
						forks_count: 9,
						archived: false,
						disabled: false,
						open_issues_count: 0,
						license: {
							key: 'mit',
							name: 'MIT License',
						},
						visibility: 'public',
						default_branch: 'master',
					},
				]);
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['getUserRepositoriesLimit.workflow.json'],
		});
	});
});
