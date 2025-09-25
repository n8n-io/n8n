import { NodeApiError } from 'n8n-workflow';
import { Github } from '../../Github.node';

// Mock the GitHub API functions
jest.mock('../../GenericFunctions', () => ({
	githubApiRequest: jest.fn(),
	githubApiRequestAllItems: jest.fn(),
}));

import { githubApiRequest, githubApiRequestAllItems } from '../../GenericFunctions';

describe('Test Github Search Node', () => {
	describe('Search Repositories', () => {
		const searchResponse = {
			total_count: 1234,
			incomplete_results: false,
			items: [
				{
					id: 123456789,
					node_id: 'MDEwOlJlcG9zaXRvcnkxMjM0NTY3ODk=',
					name: 'test-repo',
					full_name: 'test-owner/test-repo',
					private: false,
					owner: {
						login: 'test-owner',
						id: 123456,
						type: 'User',
					},
					html_url: 'https://github.com/test-owner/test-repo',
					description: 'A test repository',
					fork: false,
					url: 'https://api.github.com/repos/test-owner/test-repo',
					created_at: '2023-01-01T00:00:00Z',
					updated_at: '2023-01-02T00:00:00Z',
					pushed_at: '2023-01-03T00:00:00Z',
					git_url: 'git://github.com/test-owner/test-repo.git',
					ssh_url: 'git@github.com:test-owner/test-repo.git',
					clone_url: 'https://github.com/test-owner/test-repo.git',
					size: 1024,
					language: 'JavaScript',
					has_issues: true,
					has_projects: true,
					has_downloads: true,
					has_wiki: true,
					has_pages: false,
					has_discussions: false,
					forks_count: 10,
					mirror_url: null,
					archived: false,
					disabled: false,
					open_issues_count: 5,
					license: {
						key: 'mit',
						name: 'MIT License',
						url: 'https://api.github.com/licenses/mit',
					},
					allow_forking: true,
					is_template: false,
					web_commit_signoff_required: false,
					topics: ['test', 'example'],
					visibility: 'public',
					forks: 10,
					open_issues: 5,
					watchers: 20,
					default_branch: 'main',
					score: 1.0,
				},
			],
		};

		beforeAll(async () => {
			jest.useFakeTimers({ doNotFake: ['nextTick'] });
		});

		describe('Search Repositories Operation', () => {
			let githubNode: Github;
			let mockExecutionContext: any;

			beforeEach(() => {
				githubNode = new Github();
				mockExecutionContext = {
					getNode: jest.fn().mockReturnValue({ name: 'Github' }),
					getNodeParameter: jest.fn(),
					getInputData: jest.fn().mockReturnValue([{ json: {} }]),
					continueOnFail: jest.fn().mockReturnValue(false),
					getCredentials: jest.fn().mockResolvedValue({
						server: 'https://api.github.com',
						user: 'test',
						accessToken: 'test',
					}),
					helpers: {
						returnJsonArray: jest.fn().mockReturnValue([{ json: searchResponse }]),
						constructExecutionMetaData: jest.fn().mockReturnValue([{ json: searchResponse }]),
					},
				};

				// Reset mocks
				(githubApiRequest as jest.Mock).mockReset();
				(githubApiRequestAllItems as jest.Mock).mockReset();
			});

			it('should search repositories with basic query', async () => {
				mockExecutionContext.getNodeParameter.mockImplementation((parameterName: string) => {
					switch (parameterName) {
						case 'resource':
							return 'search';
						case 'operation':
							return 'searchRepositories';
						case 'query':
							return 'language:javascript stars:>1000';
						case 'sort':
							return 'stars';
						case 'order':
							return 'desc';
						case 'returnAll':
							return false;
						case 'limit':
							return 30;
						default:
							return '';
					}
				});

				(githubApiRequest as jest.Mock).mockResolvedValue(searchResponse);

				const result = await githubNode.execute.call(mockExecutionContext);

				expect(githubApiRequest).toHaveBeenCalledWith(
					'GET',
					'/search/repositories',
					{},
					{
						q: 'language:javascript stars:>1000',
						sort: 'stars',
						order: 'desc',
						per_page: 30,
					},
				);

				expect(result).toEqual([[{ json: searchResponse }]]);
			});

			it('should search repositories with returnAll enabled', async () => {
				mockExecutionContext.getNodeParameter.mockImplementation((parameterName: string) => {
					switch (parameterName) {
						case 'resource':
							return 'search';
						case 'operation':
							return 'searchRepositories';
						case 'query':
							return 'react hooks';
						case 'sort':
							return 'best-match';
						case 'order':
							return 'desc';
						case 'returnAll':
							return true;
						default:
							return '';
					}
				});

				(githubApiRequestAllItems as jest.Mock).mockResolvedValue(searchResponse.items);

				const result = await githubNode.execute.call(mockExecutionContext);

				expect(githubApiRequestAllItems).toHaveBeenCalledWith(
					'GET',
					'/search/repositories',
					{},
					{
						q: 'react hooks',
					},
				);

				expect(result).toEqual([[{ json: searchResponse }]]);
			});

			it('should handle search with different sort options', async () => {
				mockExecutionContext.getNodeParameter.mockImplementation((parameterName: string) => {
					switch (parameterName) {
						case 'resource':
							return 'search';
						case 'operation':
							return 'searchRepositories';
						case 'query':
							return 'machine learning';
						case 'sort':
							return 'forks';
						case 'order':
							return 'asc';
						case 'returnAll':
							return false;
						case 'limit':
							return 10;
						default:
							return '';
					}
				});

				(githubApiRequest as jest.Mock).mockResolvedValue(searchResponse);

				const result = await githubNode.execute.call(mockExecutionContext);

				expect(githubApiRequest).toHaveBeenCalledWith(
					'GET',
					'/search/repositories',
					{},
					{
						q: 'machine learning',
						sort: 'forks',
						order: 'asc',
						per_page: 10,
					},
				);

				expect(result).toEqual([[{ json: searchResponse }]]);
			});

			it('should handle search with user filter', async () => {
				mockExecutionContext.getNodeParameter.mockImplementation((parameterName: string) => {
					switch (parameterName) {
						case 'resource':
							return 'search';
						case 'operation':
							return 'searchRepositories';
						case 'query':
							return 'user:facebook react';
						case 'sort':
							return 'updated';
						case 'order':
							return 'desc';
						case 'returnAll':
							return false;
						case 'limit':
							return 50;
						default:
							return '';
					}
				});

				(githubApiRequest as jest.Mock).mockResolvedValue(searchResponse);

				const result = await githubNode.execute.call(mockExecutionContext);

				expect(githubApiRequest).toHaveBeenCalledWith(
					'GET',
					'/search/repositories',
					{},
					{
						q: 'user:facebook react',
						sort: 'updated',
						order: 'desc',
						per_page: 50,
					},
				);

				expect(result).toEqual([[{ json: searchResponse }]]);
			});

			it('should handle search with organization filter', async () => {
				mockExecutionContext.getNodeParameter.mockImplementation((parameterName: string) => {
					switch (parameterName) {
						case 'resource':
							return 'search';
						case 'operation':
							return 'searchRepositories';
						case 'query':
							return 'org:microsoft language:typescript';
						case 'sort':
							return 'help-wanted-issues';
						case 'order':
							return 'desc';
						case 'returnAll':
							return false;
						case 'limit':
							return 25;
						default:
							return '';
					}
				});

				(githubApiRequest as jest.Mock).mockResolvedValue(searchResponse);

				const result = await githubNode.execute.call(mockExecutionContext);

				expect(githubApiRequest).toHaveBeenCalledWith(
					'GET',
					'/search/repositories',
					{},
					{
						q: 'org:microsoft language:typescript',
						sort: 'help-wanted-issues',
						order: 'desc',
						per_page: 25,
					},
				);

				expect(result).toEqual([[{ json: searchResponse }]]);
			});

			it('should handle API errors gracefully', async () => {
				mockExecutionContext.getNodeParameter.mockImplementation((parameterName: string) => {
					switch (parameterName) {
						case 'resource':
							return 'search';
						case 'operation':
							return 'searchRepositories';
						case 'query':
							return 'invalid:query:';
						default:
							return '';
					}
				});

				(githubApiRequest as jest.Mock).mockRejectedValue(
					new NodeApiError(mockExecutionContext.getNode(), {
						statusCode: 422,
						message: 'GitHub API Error',
					}),
				);

				await expect(githubNode.execute.call(mockExecutionContext)).rejects.toThrow(NodeApiError);
			});
		});
	});
});
