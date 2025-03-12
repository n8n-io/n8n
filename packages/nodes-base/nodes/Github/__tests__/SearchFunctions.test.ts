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
		it('should fetch branches and tags', async () => {
			const owner = 'test-owner';
			const repository = 'test-repo';
			const branches = [{ name: 'MyTest' }, { name: 'NewTest' }];
			const tags = [{ name: 'v1.0.0' }, { name: 'v2.0.0' }];

			(mockLoadOptionsFunctions.getCurrentNodeParameter as jest.Mock).mockImplementation(
				(param: string) => {
					if (param === 'owner') return owner;
					if (param === 'repository') return repository;
				},
			);

			(mockLoadOptionsFunctions.helpers.requestWithAuthentication as jest.Mock)
				.mockResolvedValueOnce(branches)
				.mockResolvedValueOnce(tags);

			const result = await getRefs.call(mockLoadOptionsFunctions);

			expect(result).toEqual({
				results: [
					{ name: 'MyTest', value: 'MyTest', description: 'Branch: MyTest' },
					{ name: 'NewTest', value: 'NewTest', description: 'Branch: NewTest' },
					{ name: 'v1.0.0', value: 'v1.0.0', description: 'Tag: v1.0.0' },
					{ name: 'v2.0.0', value: 'v2.0.0', description: 'Tag: v2.0.0' },
				],
				paginationToken: undefined,
			});
		});

		it('should filter refs based on the provided filter', async () => {
			const owner = 'test-owner';
			const repository = 'test-repo';
			const branches = [{ name: 'main' }, { name: 'dev' }];
			const tags = [{ name: 'v1.0.0' }, { name: 'v2.0.0' }];

			(mockLoadOptionsFunctions.getCurrentNodeParameter as jest.Mock)
				.mockReturnValueOnce(owner)
				.mockReturnValueOnce(repository);
			(mockLoadOptionsFunctions.helpers.requestWithAuthentication as jest.Mock)
				.mockResolvedValueOnce(branches)
				.mockResolvedValueOnce(tags);

			const result = await getRefs.call(mockLoadOptionsFunctions, 'v1');

			expect(result).toEqual({
				results: [{ name: 'v1.0.0', value: 'v1.0.0', description: 'Tag: v1.0.0' }],
			});
		});
	});
});
