import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Github Node - Organization getRepositories', () => {
	const credentials = {
		githubApi: {
			accessToken: 'test-token',
			server: 'https://api.github.com',
			user: 'testuser',
		},
	};

	describe('Basic getRepositories Operation', () => {
		beforeAll(() => {
			const mock = nock('https://api.github.com');

			mock
				.get('/orgs/testorg/repos')
				.query(true)
				.reply(200, [
					{
						id: 1296269,
						name: 'hello-world',
						full_name: 'testorg/hello-world',
						owner: {
							login: 'testorg',
							id: 1,
							type: 'Organization',
						},
						private: false,
						html_url: 'https://github.com/testorg/hello-world',
						description: 'My first repository on GitHub!',
						fork: false,
						created_at: '2011-01-26T19:01:12Z',
						updated_at: '2011-01-26T19:14:43Z',
						pushed_at: '2011-01-26T19:06:43Z',
						clone_url: 'https://github.com/testorg/hello-world.git',
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
						name: 'test-repo',
						full_name: 'testorg/test-repo',
						owner: {
							login: 'testorg',
							id: 1,
							type: 'Organization',
						},
						private: true,
						html_url: 'https://github.com/testorg/test-repo',
						description: 'Test repository',
						fork: false,
						created_at: '2011-01-27T19:01:12Z',
						updated_at: '2011-01-27T19:14:43Z',
						pushed_at: '2011-01-27T19:06:43Z',
						clone_url: 'https://github.com/testorg/test-repo.git',
						size: 256,
						stargazers_count: 42,
						watchers_count: 15,
						language: 'JavaScript',
						forks_count: 3,
						archived: false,
						disabled: false,
						open_issues_count: 2,
						license: {
							key: 'apache-2.0',
							name: 'Apache License 2.0',
						},
						visibility: 'private',
						default_branch: 'main',
					},
				]);
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['getRepositories.workflow.json'],
		});
	});

	describe('Paginated getRepositories Operation', () => {
		beforeAll(() => {
			const mock = nock('https://api.github.com');

			mock
				.get('/orgs/testorg/repos')
				.query({ per_page: 1 })
				.reply(200, [
					{
						id: 1296269,
						name: 'hello-world',
						full_name: 'testorg/hello-world',
						owner: {
							login: 'testorg',
							id: 1,
							type: 'Organization',
						},
						private: false,
						html_url: 'https://github.com/testorg/hello-world',
						description: 'My first repository on GitHub!',
						fork: false,
						created_at: '2011-01-26T19:01:12Z',
						updated_at: '2011-01-26T19:14:43Z',
						pushed_at: '2011-01-26T19:06:43Z',
						clone_url: 'https://github.com/testorg/hello-world.git',
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
			workflowFiles: ['getRepositoriesLimit.workflow.json'],
		});
	});
});
