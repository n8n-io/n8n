import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { getUsers, getRepositories, getWorkflows, getRefs } from '../SearchFunctions';

const mockLoadOptionsFunctions = {
	getNodeParameter: jest.fn(),
	getCredentials: jest.fn().mockResolvedValue({
		server: 'https://api.github.com',
	}),
	helpers: {
		requestWithAuthentication: jest.fn(),
	},
	getCurrentNodeParameter: jest.fn(),
} as unknown as ILoadOptionsFunctions;

describe('Search Functions', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getUsers', () => {
		it('should fetch users', async () => {
			const filter = 'test-user';
			const responseData = {
				items: [
					{ login: 'test-user-1', html_url: 'https://github.com/test-user-1' },
					{ login: 'test-user-2', html_url: 'https://github.com/test-user-2' },
				],
				total_count: 2,
			};

			(mockLoadOptionsFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				responseData,
			);

			const result = await getUsers.call(mockLoadOptionsFunctions, filter);

			expect(result).toEqual({
				results: [
					{ name: 'test-user-1', value: 'test-user-1', url: 'https://github.com/test-user-1' },
					{ name: 'test-user-2', value: 'test-user-2', url: 'https://github.com/test-user-2' },
				],
				paginationToken: undefined,
			});

			expect(mockLoadOptionsFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'githubOAuth2Api',
				expect.objectContaining({
					method: 'GET',
					qs: expect.objectContaining({ page: 1 }),
				}),
			);
		});

		it('should handle pagination', async () => {
			const filter = 'test-user';
			const responseData = {
				items: [
					{ login: 'test-user-1', html_url: 'https://github.com/test-user-1' },
					{ login: 'test-user-2', html_url: 'https://github.com/test-user-2' },
				],
				total_count: 200,
			};

			(mockLoadOptionsFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				responseData,
			);

			const result = await getUsers.call(mockLoadOptionsFunctions, filter);

			expect(result).toEqual({
				results: [
					{ name: 'test-user-1', value: 'test-user-1', url: 'https://github.com/test-user-1' },
					{ name: 'test-user-2', value: 'test-user-2', url: 'https://github.com/test-user-2' },
				],
				paginationToken: 2,
			});
		});

		it('should use paginationToken when provided', async () => {
			const filter = 'test-user';
			const paginationToken = '3';
			const responseData = {
				items: [
					{ login: 'test-user-5', html_url: 'https://github.com/test-user-5' },
					{ login: 'test-user-6', html_url: 'https://github.com/test-user-6' },
				],
				total_count: 200,
			};

			(mockLoadOptionsFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				responseData,
			);

			const result = await getUsers.call(mockLoadOptionsFunctions, filter, paginationToken);

			expect(result).toEqual({
				results: [
					{ name: 'test-user-5', value: 'test-user-5', url: 'https://github.com/test-user-5' },
					{ name: 'test-user-6', value: 'test-user-6', url: 'https://github.com/test-user-6' },
				],
				paginationToken: undefined,
			});

			expect(mockLoadOptionsFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'githubOAuth2Api',
				expect.objectContaining({
					method: 'GET',
					qs: expect.objectContaining({ page: 3 }),
				}),
			);
		});
	});

	describe('getRepositories', () => {
		it('should fetch repositories', async () => {
			const filter = 'test-repo';
			const owner = 'test-owner';
			const responseData = {
				items: [
					{ name: 'test-repo-1', html_url: 'https://github.com/test-owner/test-repo-1' },
					{ name: 'test-repo-2', html_url: 'https://github.com/test-owner/test-repo-2' },
				],
				total_count: 2,
			};

			(mockLoadOptionsFunctions.getCurrentNodeParameter as jest.Mock).mockReturnValue(owner);
			(mockLoadOptionsFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				responseData,
			);

			const result = await getRepositories.call(mockLoadOptionsFunctions, filter);

			expect(result).toEqual({
				results: [
					{
						name: 'test-repo-1',
						value: 'test-repo-1',
						url: 'https://github.com/test-owner/test-repo-1',
					},
					{
						name: 'test-repo-2',
						value: 'test-repo-2',
						url: 'https://github.com/test-owner/test-repo-2',
					},
				],
				paginationToken: undefined,
			});
		});

		it('should fetch repositories without filter', async () => {
			const owner = 'test-owner';
			const responseData = {
				items: [
					{ name: 'test-repo-1', html_url: 'https://github.com/test-owner/test-repo-1' },
					{ name: 'test-repo-2', html_url: 'https://github.com/test-owner/test-repo-2' },
				],
				total_count: 2,
			};

			(mockLoadOptionsFunctions.getCurrentNodeParameter as jest.Mock).mockReturnValue(owner);
			(mockLoadOptionsFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				responseData,
			);

			const result = await getRepositories.call(mockLoadOptionsFunctions);

			expect(result).toEqual({
				results: [
					{
						name: 'test-repo-1',
						value: 'test-repo-1',
						url: 'https://github.com/test-owner/test-repo-1',
					},
					{
						name: 'test-repo-2',
						value: 'test-repo-2',
						url: 'https://github.com/test-owner/test-repo-2',
					},
				],
				paginationToken: undefined,
			});
		});

		it('should use paginationToken when provided', async () => {
			const filter = 'test-repo';
			const paginationToken = '3';
			const owner = 'test-owner';
			const responseData = {
				items: [
					{ name: 'test-repo-5', html_url: 'https://github.com/test-owner/test-repo-5' },
					{ name: 'test-repo-6', html_url: 'https://github.com/test-owner/test-repo-6' },
				],
				total_count: 200,
			};

			(mockLoadOptionsFunctions.getCurrentNodeParameter as jest.Mock).mockReturnValue(owner);
			(mockLoadOptionsFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				responseData,
			);

			const result = await getRepositories.call(mockLoadOptionsFunctions, filter, paginationToken);

			expect(result).toEqual({
				results: [
					{
						name: 'test-repo-5',
						value: 'test-repo-5',
						url: 'https://github.com/test-owner/test-repo-5',
					},
					{
						name: 'test-repo-6',
						value: 'test-repo-6',
						url: 'https://github.com/test-owner/test-repo-6',
					},
				],
				paginationToken: undefined,
			});

			expect(mockLoadOptionsFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'githubOAuth2Api',
				expect.objectContaining({
					method: 'GET',
					qs: expect.objectContaining({ page: 3 }),
				}),
			);
		});

		it('should handle empty repositories', async () => {
			const filter = 'test-repo';
			const owner = 'test-owner';
			const responseData = {
				items: [],
				total_count: 0,
			};

			(mockLoadOptionsFunctions.getCurrentNodeParameter as jest.Mock).mockReturnValue(owner);
			(mockLoadOptionsFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				responseData,
			);

			const result = await getRepositories.call(mockLoadOptionsFunctions, filter);

			expect(result).toEqual({
				results: [],
				paginationToken: undefined,
			});
		});
	});

	describe('getWorkflows', () => {
		it('should fetch workflows', async () => {
			const owner = 'test-owner';
			const repository = 'test-repo';
			const responseData = {
				workflows: [
					{ id: '1', name: 'workflow-1' },
					{ id: '2', name: 'workflow-2' },
				],
				total_count: 2,
			};

			(mockLoadOptionsFunctions.getCurrentNodeParameter as jest.Mock)
				.mockReturnValueOnce(owner)
				.mockReturnValueOnce(repository);
			(mockLoadOptionsFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				responseData,
			);

			const result = await getWorkflows.call(mockLoadOptionsFunctions);

			expect(result).toEqual({
				results: [
					{ name: 'workflow-1', value: '1' },
					{ name: 'workflow-2', value: '2' },
				],
				paginationToken: undefined,
			});
		});

		it('should handle pagination', async () => {
			const owner = 'test-owner';
			const repository = 'test-repo';
			const responseData = {
				workflows: [
					{ id: '1', name: 'workflow-1' },
					{ id: '2', name: 'workflow-2' },
				],
				total_count: 200,
			};

			(mockLoadOptionsFunctions.getCurrentNodeParameter as jest.Mock)
				.mockReturnValueOnce(owner)
				.mockReturnValueOnce(repository);
			(mockLoadOptionsFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				responseData,
			);

			const result = await getWorkflows.call(mockLoadOptionsFunctions);

			expect(result).toEqual({
				results: [
					{ name: 'workflow-1', value: '1' },
					{ name: 'workflow-2', value: '2' },
				],
				paginationToken: 2,
			});
		});

		it('should use paginationToken when provided and return next page token', async () => {
			const paginationToken = '1';
			const owner = 'test-owner';
			const repository = 'test-repo';
			const responseData = {
				workflows: [
					{ id: '3', name: 'workflow-3' },
					{ id: '4', name: 'workflow-4' },
				],
				total_count: 300,
			};

			(mockLoadOptionsFunctions.getCurrentNodeParameter as jest.Mock)
				.mockReturnValueOnce(owner)
				.mockReturnValueOnce(repository);
			(mockLoadOptionsFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				responseData,
			);

			const result = await getWorkflows.call(mockLoadOptionsFunctions, paginationToken);

			expect(result).toEqual({
				results: [
					{ name: 'workflow-3', value: '3' },
					{ name: 'workflow-4', value: '4' },
				],
				paginationToken: 2,
			});

			expect(mockLoadOptionsFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'githubOAuth2Api',
				expect.objectContaining({
					method: 'GET',
					qs: expect.objectContaining({ page: 1 }),
				}),
			);
		});

		it('should handle empty workflows', async () => {
			const owner = 'test-owner';
			const repository = 'test-repo';
			const responseData = {
				workflows: [],
				total_count: 0,
			};

			(mockLoadOptionsFunctions.getCurrentNodeParameter as jest.Mock)
				.mockReturnValueOnce(owner)
				.mockReturnValueOnce(repository);
			(mockLoadOptionsFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				responseData,
			);

			const result = await getWorkflows.call(mockLoadOptionsFunctions);

			expect(result).toEqual({
				results: [],
				paginationToken: undefined,
			});
		});
	});

	describe('getRefs', () => {
		it('should fetch branches and tags using git/refs endpoint', async () => {
			const owner = 'test-owner';
			const repository = 'test-repo';
			const refsResponse = [
				{ ref: 'refs/heads/Main' },
				{ ref: 'refs/heads/Dev' },
				{ ref: 'refs/tags/v1.0.0' },
				{ ref: 'refs/tags/v2.0.0' },
				{ ref: 'refs/Pull/123/head' },
			];

			(mockLoadOptionsFunctions.getCurrentNodeParameter as jest.Mock).mockImplementation(
				(param: string) => {
					if (param === 'owner') return owner;
					if (param === 'repository') return repository;
				},
			);

			(mockLoadOptionsFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				refsResponse,
			);

			const result = await getRefs.call(mockLoadOptionsFunctions);

			expect(result).toEqual({
				results: [
					{ name: 'Main', value: 'Main', description: 'Branch: Main' },
					{ name: 'Dev', value: 'Dev', description: 'Branch: Dev' },
					{ name: 'v1.0.0', value: 'v1.0.0', description: 'Tag: v1.0.0' },
					{ name: 'v2.0.0', value: 'v2.0.0', description: 'Tag: v2.0.0' },
					{ name: '123/head', value: '123/head', description: 'Pull: 123/head' },
				],
				paginationToken: undefined,
			});
		});

		it('should use paginationToken when provided', async () => {
			const paginationToken = '3';
			const owner = 'test-owner';
			const repository = 'test-repo';
			const refsResponse = [{ ref: 'refs/heads/branch-5' }, { ref: 'refs/heads/branch-6' }];

			(mockLoadOptionsFunctions.getCurrentNodeParameter as jest.Mock).mockImplementation(
				(param: string) => {
					if (param === 'owner') return owner;
					if (param === 'repository') return repository;
				},
			);

			(mockLoadOptionsFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				refsResponse,
			);

			const result = await getRefs.call(mockLoadOptionsFunctions, undefined, paginationToken);

			expect(result).toEqual({
				results: [
					{ name: 'branch-5', value: 'branch-5', description: 'Branch: branch-5' },
					{ name: 'branch-6', value: 'branch-6', description: 'Branch: branch-6' },
				],
				paginationToken: undefined,
			});

			expect(mockLoadOptionsFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'githubOAuth2Api',
				expect.objectContaining({
					method: 'GET',
					qs: expect.objectContaining({ page: 3 }),
				}),
			);
		});

		it('should filter refs based on the provided filter', async () => {
			const owner = 'test-owner';
			const repository = 'test-repo';
			const refsResponse = [
				{ ref: 'refs/heads/main' },
				{ ref: 'refs/heads/dev' },
				{ ref: 'refs/tags/v1.0.0' },
				{ ref: 'refs/tags/v2.0.0' },
			];

			(mockLoadOptionsFunctions.getCurrentNodeParameter as jest.Mock).mockImplementation(
				(param: string) => {
					if (param === 'owner') return owner;
					if (param === 'repository') return repository;
				},
			);

			(mockLoadOptionsFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				refsResponse,
			);

			const result = await getRefs.call(mockLoadOptionsFunctions, 'v1');

			expect(result).toEqual({
				results: [{ name: 'v1.0.0', value: 'v1.0.0', description: 'Tag: v1.0.0' }],
			});
		});

		it('should handle pagination correctly', async () => {
			const owner = 'test-owner';
			const repository = 'test-repo';
			const refsResponse = Array(100)
				.fill(0)
				.map((_, i) => ({
					ref: i % 2 === 0 ? `refs/heads/branch-${i}` : `refs/tags/tag-${i}`,
				}));

			(mockLoadOptionsFunctions.getCurrentNodeParameter as jest.Mock).mockImplementation(
				(param: string) => {
					if (param === 'owner') return owner;
					if (param === 'repository') return repository;
				},
			);

			(mockLoadOptionsFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				refsResponse,
			);

			const result = await getRefs.call(mockLoadOptionsFunctions);

			expect(result.paginationToken).toBe(2);
			expect(result.results.length).toBe(100);
		});
	});
});
