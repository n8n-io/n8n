import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import type { SimpleGit } from 'simple-git';

import { Git } from '../Git.node';

// Mock simple-git
const mockGit = {
	checkout: jest.fn(),
	checkoutLocalBranch: jest.fn(),
	add: jest.fn(),
	commit: jest.fn(),
	push: jest.fn(),
	pull: jest.fn(),
	clone: jest.fn(),
	addConfig: jest.fn(),
	fetch: jest.fn(),
	log: jest.fn(),
	pushTags: jest.fn(),
	listConfig: jest.fn(),
	status: jest.fn(),
	addTag: jest.fn(),
	env: jest.fn().mockReturnThis(),
} as unknown as jest.Mocked<SimpleGit>;

jest.mock('simple-git', () => ({
	__esModule: true,
	default: () => mockGit,
}));

// Mock filesystem operations
jest.mock('fs/promises', () => ({
	access: jest.fn(),
	mkdir: jest.fn(),
}));

describe('Git Node', () => {
	let gitNode: Git;
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;

	beforeEach(() => {
		gitNode = new Git();
		mockExecuteFunctions = mock<IExecuteFunctions>({
			getInputData: jest.fn(() => [{ json: {} }]),
			getNodeParameter: jest.fn(),
			continueOnFail: jest.fn(() => false),
			helpers: {
				returnJsonArray: jest.fn((data: any[]) => data.map((item: any) => ({ json: item }))),
			},
		});
		jest.clearAllMocks();
	});

	describe('Branch switching', () => {
		it('should switch to existing branch for commit operation', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('commit')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({ branch: 'feature' })
				.mockReturnValueOnce('test commit');

			await gitNode.execute.call(mockExecuteFunctions);

			expect(mockGit.checkout).toHaveBeenCalledWith('feature');
			expect(mockGit.commit).toHaveBeenCalledWith('test commit', undefined);
		});

		it('should create new branch if checkout fails for push operation', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('push')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({ branch: 'new-branch' })
				.mockReturnValueOnce('none');

			mockGit.checkout.mockRejectedValueOnce(new Error('Branch not found'));

			await gitNode.execute.call(mockExecuteFunctions);

			expect(mockGit.checkout).toHaveBeenCalledWith('new-branch');
			expect(mockGit.checkoutLocalBranch).toHaveBeenCalledWith('new-branch');
			expect(mockGit.push).toHaveBeenCalled();
		});

		it('should switch to branch for pull operation', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('pull')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({ branch: 'main' });

			await gitNode.execute.call(mockExecuteFunctions);

			expect(mockGit.checkout).toHaveBeenCalledWith('main');
			expect(mockGit.pull).toHaveBeenCalled();
		});

		it('should not switch branch when not specified', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('commit')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({}) // no branch
				.mockReturnValueOnce('test commit');

			await gitNode.execute.call(mockExecuteFunctions);

			expect(mockGit.checkout).not.toHaveBeenCalled();
			expect(mockGit.commit).toHaveBeenCalledWith('test commit', undefined);
		});
	});

	describe('All operations coverage', () => {
		it('should handle add operation', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('add')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({})
				.mockReturnValueOnce('file.txt');

			const result = await gitNode.execute.call(mockExecuteFunctions);

			expect(mockGit.add).toHaveBeenCalledWith(['file.txt']);
			expect(result[0]).toEqual([{ json: { success: true }, pairedItem: { item: 0 } }]);
		});

		it('should handle addConfig operation', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('addConfig')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({})
				.mockReturnValueOnce('user.name')
				.mockReturnValueOnce('test user');

			await gitNode.execute.call(mockExecuteFunctions);

			expect(mockGit.addConfig).toHaveBeenCalledWith('user.name', 'test user', false);
		});

		it('should handle clone operation', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('clone')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({})
				.mockReturnValueOnce('https://github.com/test/repo.git');

			await gitNode.execute.call(mockExecuteFunctions);

			expect(mockGit.clone).toHaveBeenCalledWith('https://github.com/test/repo.git', '.');
		});

		it('should handle fetch operation', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('fetch')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({});

			await gitNode.execute.call(mockExecuteFunctions);

			expect(mockGit.fetch).toHaveBeenCalled();
		});

		it('should handle log operation', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('log')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({})
				.mockReturnValueOnce(false) // returnAll
				.mockReturnValueOnce(10); // limit

			mockGit.log.mockResolvedValueOnce({ all: [{ hash: 'abc123', message: 'test' }] } as any);

			await gitNode.execute.call(mockExecuteFunctions);

			expect(mockGit.log).toHaveBeenCalledWith({ maxCount: 10 });
		});

		it('should handle pushTags operation', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('pushTags')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({});

			await gitNode.execute.call(mockExecuteFunctions);

			expect(mockGit.pushTags).toHaveBeenCalled();
		});

		it('should handle listConfig operation', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('listConfig')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({});

			mockGit.listConfig.mockResolvedValueOnce({
				values: { '.git/config': { 'user.name': 'test' } },
			} as any);

			await gitNode.execute.call(mockExecuteFunctions);

			expect(mockGit.listConfig).toHaveBeenCalled();
		});

		it('should handle status operation', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('status')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({});

			mockGit.status.mockResolvedValueOnce({ current: 'main' } as any);

			await gitNode.execute.call(mockExecuteFunctions);

			expect(mockGit.status).toHaveBeenCalled();
		});

		it('should handle tag operation', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('tag')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({})
				.mockReturnValueOnce('v1.0.0');

			await gitNode.execute.call(mockExecuteFunctions);

			expect(mockGit.addTag).toHaveBeenCalledWith('v1.0.0');
		});
	});

	describe('Error handling', () => {
		it('should continue on fail when enabled', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('commit')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({ branch: 'bad-branch' })
				.mockReturnValueOnce('test');

			mockExecuteFunctions.continueOnFail.mockReturnValueOnce(true);
			mockGit.checkout.mockRejectedValueOnce(new Error('Branch error'));
			mockGit.checkoutLocalBranch.mockRejectedValueOnce(new Error('Create error'));

			const result = await gitNode.execute.call(mockExecuteFunctions);

			expect(result[0]).toEqual([
				{
					json: { error: 'Error: Branch error' },
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should throw on fail when continueOnFail is disabled', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('add')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({})
				.mockReturnValueOnce('file.txt');

			mockGit.add.mockRejectedValueOnce(new Error('Add failed'));

			await expect(gitNode.execute.call(mockExecuteFunctions)).rejects.toThrow('Add failed');
		});
	});
});
