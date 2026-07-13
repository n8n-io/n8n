import { mock } from 'vitest-mock-extended';
import type { IExecuteFunctions, ResolvedFilePath } from 'n8n-workflow';
import type { Mocked } from 'vitest';
import { dirname } from 'node:path';
import simpleGit, { type SimpleGit } from 'simple-git';
import { mkdir, rename, rm } from 'node:fs/promises';
import { Container } from '@n8n/di';
import { SecurityConfig } from '@n8n/config';

import { Git } from '../Git.node';
import { ALLOWED_CONFIG_KEYS } from '../descriptions';

// Matches the unguessable staging directory the clone operation creates under the base.
const CLONE_STAGING_RE = /^\/git\/\.n8n-clone-[0-9a-f]{24}$/;

// Mock simple-git
const mockGit = {
	checkout: vi.fn(),
	checkoutBranch: vi.fn(),
	checkoutLocalBranch: vi.fn(),
	add: vi.fn(),
	commit: vi.fn(),
	push: vi.fn(),
	pull: vi.fn(),
	clone: vi.fn(),
	addConfig: vi.fn(),
	fetch: vi.fn(),
	log: vi.fn(),
	pushTags: vi.fn(),
	listConfig: vi.fn(),
	status: vi.fn(),
	addTag: vi.fn(),
	raw: vi.fn(),
	env: vi.fn().mockReturnThis(),
} as unknown as Mocked<SimpleGit>;

vi.mock('simple-git', () => ({
	__esModule: true,
	default: vi.fn(() => mockGit),
}));

const mockSimpleGit = vi.mocked(simpleGit);

// Mock filesystem operations used by the clone staging flow
vi.mock('node:fs/promises', async () => ({
	...(await vi.importActual('node:fs/promises')),
	mkdir: vi.fn(),
	rename: vi.fn(),
	rm: vi.fn(),
}));

const mockMkdir = vi.mocked(mkdir);
const mockRename = vi.mocked(rename);
const mockRm = vi.mocked(rm);

describe('Git Node', () => {
	let gitNode: Git;
	let mockExecuteFunctions: Mocked<IExecuteFunctions>;

	beforeEach(() => {
		gitNode = new Git();
		mockExecuteFunctions = mock<IExecuteFunctions>({
			getInputData: vi.fn(() => [{ json: {} }]),
			getNodeParameter: vi.fn(),
			continueOnFail: vi.fn(() => false),
			helpers: {
				returnJsonArray: vi.fn((data: any[]) => data.map((item: any) => ({ json: item }))),
				resolvePath: vi.fn(async (path: string) => path as any),
				isFilePathBlocked: vi.fn(() => false),
				assertNoSymlinkInPath: vi.fn(async () => {}),
				ensureParentDirectoryWithoutFollowingSymlinks: vi.fn(async () => {}),
				resolveStagingBaseForTarget: vi.fn(
					async (target: string) => dirname(target) as ResolvedFilePath,
				),
				pinDirectory: vi.fn(async () => null),
			},
		});
		vi.clearAllMocks();
		mockGit.listConfig.mockResolvedValue({ values: {} } as any);
		mockMkdir.mockResolvedValue(undefined);
		mockRename.mockResolvedValue(undefined);
		mockRm.mockResolvedValue(undefined);
	});

	describe('Environment validation', () => {
		it('should not include invalid inherited environment keys in simple-git env', async () => {
			const inheritedEnvKey = 'N8N_TEST_INVALID_ENV_KEY';
			(Object.prototype as Record<string, unknown>)[inheritedEnvKey] = 'ignored';

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('log')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({});

			mockGit.log.mockResolvedValueOnce({ all: [] } as any);

			try {
				await gitNode.execute.call(mockExecuteFunctions);
			} finally {
				delete (Object.prototype as Record<string, unknown>)[inheritedEnvKey];
			}

			expect(mockGit.env).toHaveBeenCalledTimes(1);
			const envArg = mockGit.env.mock.calls[0][0] as Record<string, string>;
			expect(Object.prototype.hasOwnProperty.call(envArg, inheritedEnvKey)).toBe(false);
			expect(envArg[inheritedEnvKey]).toBeUndefined();
			expect(envArg.GIT_TERMINAL_PROMPT).toBe('0');
		});
	});

	describe('Branch switching', () => {
		const mockNodeParameters = (params: Record<string, unknown>) => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(name: string, _itemIndex: number, fallbackValue?: unknown) =>
					(name in params ? params[name] : fallbackValue) as any,
			);
		};

		it('should reject commit operation when branch starts with hyphen', async () => {
			mockNodeParameters({
				operation: 'commit',
				repositoryPath: '/repo',
				options: { branch: '-main' },
				message: 'test commit',
			});

			await expect(gitNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
				'Reference cannot start with a hyphen',
			);

			expect(mockGit.checkout).not.toHaveBeenCalled();
			expect(mockGit.commit).not.toHaveBeenCalled();
		});

		it('should reject push operation when branch starts with hyphen', async () => {
			mockNodeParameters({
				operation: 'push',
				repositoryPath: '/repo',
				options: { branch: '--pathspec-from-file' },
			});

			await expect(gitNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
				'Reference cannot start with a hyphen',
			);

			expect(mockGit.checkout).not.toHaveBeenCalled();
			expect(mockGit.push).not.toHaveBeenCalled();
		});

		it('should switch to existing branch for commit operation', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('commit')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({ branch: 'feature' })
				.mockReturnValueOnce('test commit');

			await gitNode.execute.call(mockExecuteFunctions);

			expect(mockGit.checkout).toHaveBeenCalledWith('feature');
			expect(mockGit.commit).toHaveBeenCalledWith('test commit');
		});

		it('should commit specific files when pathsToAdd is provided', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('commit')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({
					branch: 'feature-branch',
					files: true,
					pathsToAdd: 'src/file1.js,src/file2.js,README.md',
				})
				.mockReturnValueOnce('Add specific files');

			mockGit.checkout.mockResolvedValueOnce('Switched to branch feature-branch' as any);

			const result = await gitNode.execute.call(mockExecuteFunctions);

			expect(mockGit.checkout).toHaveBeenCalledWith('feature-branch');
			// Uses -- separator to prevent argument injection
			expect(mockGit.commit).toHaveBeenCalledWith('Add specific files', [
				'--',
				'src/file1.js',
				'src/file2.js',
				'README.md',
			]);
			expect(result[0]).toEqual([{ json: { success: true }, pairedItem: { item: 0 } }]);
		});

		it('should fail when trying to push to non-existent branch', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('push')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({ branch: 'non-existent-branch' })
				.mockReturnValueOnce('none');

			const error = new Error('Branch not found');
			mockGit.checkout.mockRejectedValueOnce(error);

			await expect(gitNode.execute.call(mockExecuteFunctions)).rejects.toThrow('Branch not found');

			expect(mockGit.checkout).toHaveBeenCalledWith('non-existent-branch');
			expect(mockGit.checkoutLocalBranch).not.toHaveBeenCalled();
			expect(mockGit.push).not.toHaveBeenCalled();
		});

		it('should set upstream when creating branch for commit operation', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('commit')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({ branch: 'feature-branch' })
				.mockReturnValueOnce('commit message');

			mockGit.checkout.mockRejectedValueOnce(new Error('Branch not found'));

			await gitNode.execute.call(mockExecuteFunctions);

			expect(mockGit.checkout).toHaveBeenCalledWith('feature-branch');
			expect(mockGit.checkoutLocalBranch).toHaveBeenCalledWith('feature-branch');
			expect(mockGit.addConfig).toHaveBeenCalledWith('branch.feature-branch.remote', 'origin');
			expect(mockGit.addConfig).toHaveBeenCalledWith(
				'branch.feature-branch.merge',
				'refs/heads/feature-branch',
			);
			expect(mockGit.commit).toHaveBeenCalledWith('commit message');
		});

		it('should set upstream when switching to existing branch for push operation', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('push')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({ branch: 'existing-branch' })
				.mockReturnValueOnce('none');

			// Branch exists, so checkout succeeds
			mockGit.checkout.mockResolvedValueOnce('Switched to branch existing-branch' as any);

			await gitNode.execute.call(mockExecuteFunctions);

			expect(mockGit.checkout).toHaveBeenCalledWith('existing-branch');
			expect(mockGit.checkoutLocalBranch).not.toHaveBeenCalled();
			expect(mockGit.addConfig).toHaveBeenCalledWith('branch.existing-branch.remote', 'origin');
			expect(mockGit.addConfig).toHaveBeenCalledWith(
				'branch.existing-branch.merge',
				'refs/heads/existing-branch',
			);
			expect(mockGit.push).toHaveBeenCalled();
		});

		it('should push to specific repository when repository option is provided', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('push')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({
					branch: 'feature-branch',
					repository: true,
					targetRepository: 'https://github.com/example/repo.git',
				})
				.mockReturnValueOnce('none');

			// Branch exists, so checkout succeeds
			mockGit.checkout.mockResolvedValueOnce('Switched to branch feature-branch' as any);

			await gitNode.execute.call(mockExecuteFunctions);

			expect(mockGit.checkout).toHaveBeenCalledWith('feature-branch');
			expect(mockGit.push).toHaveBeenCalledWith('https://github.com/example/repo.git');
		});

		it('should not push to a blocked local target repository path', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('push')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({
					repository: true,
					targetRepository: '/blocked/target-repo',
				});
			mockExecuteFunctions.helpers.isFilePathBlocked = vi.fn(
				(path: string) => path === '/blocked/target-repo',
			);

			await expect(gitNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
				'Access to the target repository path is not allowed',
			);

			expect(mockGit.push).not.toHaveBeenCalled();
		});

		it('should reject push target repositories starting with a hyphen', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('push')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({
					repository: true,
					targetRepository: '--upload-pack=git-upload-pack',
				});

			await expect(gitNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
				'Target repository cannot start with a hyphen',
			);

			expect(mockGit.push).not.toHaveBeenCalled();
		});

		it('should not switch branch when pushing with empty branch string', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('push')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({ branch: '' }) // empty string branch
				.mockReturnValueOnce('gitPassword');

			// Mock git config for push operation
			mockGit.listConfig.mockResolvedValueOnce({
				values: { '.git/config': { 'remote.origin.url': 'https://github.com/test/repo.git' } },
			} as any);

			await gitNode.execute.call(mockExecuteFunctions);

			expect(mockGit.checkout).not.toHaveBeenCalled();
			expect(mockGit.push).toHaveBeenCalled();
		});

		it('should not push to a blocked config-derived target repository path', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('push')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({})
				.mockReturnValueOnce('gitPassword');
			mockGit.listConfig.mockResolvedValueOnce({
				values: { '.git/config': { 'remote.origin.url': '/blocked/target-repo' } },
			} as any);
			mockExecuteFunctions.helpers.isFilePathBlocked = vi.fn(
				(path: string) => path === '/blocked/target-repo',
			);

			await expect(gitNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
				'Access to the target repository path is not allowed',
			);

			expect(mockGit.push).not.toHaveBeenCalled();
		});

		it('should not default push to a blocked configured target repository path without authentication', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('push')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({})
				.mockReturnValueOnce('none');
			mockGit.listConfig.mockResolvedValueOnce({
				values: { '.git/config': { 'remote.origin.url': '/blocked/target-repo' } },
			} as any);
			mockExecuteFunctions.helpers.isFilePathBlocked = vi.fn(
				(path: string) => path === '/blocked/target-repo',
			);

			await expect(gitNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
				'Access to the target repository path is not allowed',
			);

			expect(mockGit.push).not.toHaveBeenCalled();
		});

		it('should not default push to a blocked configured push URL without authentication', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('push')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({})
				.mockReturnValueOnce('none');
			mockGit.listConfig.mockResolvedValueOnce({
				values: {
					'.git/config': {
						'remote.origin.url': 'https://github.com/test/repo.git',
						'remote.origin.pushurl': '/blocked/target-repo',
					},
				},
			} as any);
			mockExecuteFunctions.helpers.isFilePathBlocked = vi.fn(
				(path: string) => path === '/blocked/target-repo',
			);

			await expect(gitNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
				'Access to the target repository path is not allowed',
			);

			expect(mockGit.push).not.toHaveBeenCalled();
		});

		it('should default push when no target repository is configured', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('push')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({})
				.mockReturnValueOnce('none');

			await gitNode.execute.call(mockExecuteFunctions);

			expect(mockGit.listConfig).toHaveBeenCalled();
			expect(mockGit.push).toHaveBeenCalledWith();
		});

		it('should require a configured target repository when pushing with password authentication', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('push')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({})
				.mockReturnValueOnce('gitPassword');

			await expect(gitNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
				'Target repository is required',
			);

			expect(mockGit.push).not.toHaveBeenCalled();
		});

		it('should reject non-string configured target repositories', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('push')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({})
				.mockReturnValueOnce('none');
			mockGit.listConfig.mockResolvedValueOnce({
				values: {
					'.git/config': {
						'remote.origin.url': [
							'https://github.com/test/repo.git',
							'https://github.com/test/other.git',
						],
					},
				},
			} as any);

			await expect(gitNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
				'Target repository is required',
			);

			expect(mockGit.push).not.toHaveBeenCalled();
		});

		it('should reject non-string configured push URLs', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('push')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({})
				.mockReturnValueOnce('none');
			mockGit.listConfig.mockResolvedValueOnce({
				values: {
					'.git/config': {
						'remote.origin.url': 'https://github.com/test/repo.git',
						'remote.origin.pushurl': [
							'https://github.com/test/repo.git',
							'https://github.com/test/other.git',
						],
					},
				},
			} as any);

			await expect(gitNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
				'Target repository is required',
			);

			expect(mockGit.push).not.toHaveBeenCalled();
		});

		it('should reject mixed configured target repository value types', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('push')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({})
				.mockReturnValueOnce('none');
			mockGit.listConfig.mockResolvedValueOnce({
				values: {
					'.git/config': {
						'remote.origin.url': 'https://github.com/test/repo.git',
					},
					'.git/config.worktree': {
						'remote.origin.url': ['/blocked/target-repo'],
					},
				},
			} as any);

			await expect(gitNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
				'Target repository is required',
			);

			expect(mockGit.push).not.toHaveBeenCalled();
		});

		it('should handle switchBranch operation to existing branch', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('switchBranch')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({})
				.mockReturnValueOnce('existing-branch');

			const result = await gitNode.execute.call(mockExecuteFunctions);

			expect(mockGit.checkout).toHaveBeenCalledWith('existing-branch');
			expect(result[0]).toEqual([
				{ json: { success: true, branch: 'existing-branch' }, pairedItem: { item: 0 } },
			]);
		});

		it('should create new branch when switchBranch fails and createBranch is true', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('switchBranch')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({ createBranch: true })
				.mockReturnValueOnce('new-branch');

			mockGit.checkout.mockRejectedValueOnce(new Error('Branch not found'));

			const result = await gitNode.execute.call(mockExecuteFunctions);

			expect(mockGit.checkout).toHaveBeenCalledWith('new-branch');
			expect(mockGit.checkoutLocalBranch).toHaveBeenCalledWith('new-branch');
			expect(result[0]).toEqual([
				{ json: { success: true, branch: 'new-branch' }, pairedItem: { item: 0 } },
			]);
		});

		it('should create branch from start point when specified', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('switchBranch')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({ createBranch: true, startPoint: 'main' })
				.mockReturnValueOnce('feature-branch');

			mockGit.checkout.mockRejectedValueOnce(new Error('Branch not found'));

			await gitNode.execute.call(mockExecuteFunctions);

			expect(mockGit.checkout).toHaveBeenCalledWith('feature-branch');
			expect(mockGit.checkoutBranch).toHaveBeenCalledWith('feature-branch', 'main');
		});

		it('should force checkout when force option is enabled', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('switchBranch')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({ force: true })
				.mockReturnValueOnce('force-branch');

			await gitNode.execute.call(mockExecuteFunctions);

			expect(mockGit.checkout).toHaveBeenCalledWith(['-f', 'force-branch']);
		});

		it('should throw error when createBranch is false and branch does not exist', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('switchBranch')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({ createBranch: false })
				.mockReturnValueOnce('nonexistent-branch');

			const error = new Error('Branch not found');
			mockGit.checkout.mockRejectedValueOnce(error);

			await expect(gitNode.execute.call(mockExecuteFunctions)).rejects.toThrow('Branch not found');
		});

		it('should set upstream tracking when creating new branch with setUpstream option', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('switchBranch')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({
					createBranch: true,
					setUpstream: true,
					remoteName: 'origin',
				})
				.mockReturnValueOnce('feature-branch');

			mockGit.checkout.mockRejectedValueOnce(new Error('Branch not found'));

			await gitNode.execute.call(mockExecuteFunctions);

			expect(mockGit.checkout).toHaveBeenCalledWith('feature-branch');
			expect(mockGit.checkoutLocalBranch).toHaveBeenCalledWith('feature-branch');
			expect(mockGit.addConfig).toHaveBeenCalledWith('branch.feature-branch.remote', 'origin');
			expect(mockGit.addConfig).toHaveBeenCalledWith(
				'branch.feature-branch.merge',
				'refs/heads/feature-branch',
			);
		});

		it('should use default remote name when not specified', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('switchBranch')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({
					createBranch: true,
					setUpstream: true,
					// remoteName not specified, should default to 'origin'
				})
				.mockReturnValueOnce('feature-branch');

			mockGit.checkout.mockRejectedValueOnce(new Error('Branch not found'));

			await gitNode.execute.call(mockExecuteFunctions);

			expect(mockGit.addConfig).toHaveBeenCalledWith('branch.feature-branch.remote', 'origin');
		});

		it('should continue successfully even if upstream setup fails', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('switchBranch')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({
					createBranch: true,
					setUpstream: true,
					remoteName: 'origin',
				})
				.mockReturnValueOnce('feature-branch');

			mockGit.checkout.mockRejectedValueOnce(new Error('Branch not found'));
			mockGit.addConfig.mockRejectedValueOnce(new Error('Remote not found'));

			const result = await gitNode.execute.call(mockExecuteFunctions);

			expect(mockGit.checkoutLocalBranch).toHaveBeenCalledWith('feature-branch');
			expect(result[0]).toEqual([
				{
					json: { success: true, branch: 'feature-branch' },
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should not switch branch when not specified', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('commit')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({}) // no branch
				.mockReturnValueOnce('test commit');

			await gitNode.execute.call(mockExecuteFunctions);

			expect(mockGit.checkout).not.toHaveBeenCalled();
			expect(mockGit.commit).toHaveBeenCalledWith('test commit');
		});

		it('should not switch branch when empty string is provided', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('commit')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({ branch: '' }) // empty string branch
				.mockReturnValueOnce('test commit');

			await gitNode.execute.call(mockExecuteFunctions);

			expect(mockGit.checkout).not.toHaveBeenCalled();
			expect(mockGit.commit).toHaveBeenCalledWith('test commit');
		});

		it('should reject switchBranch operation when branchName starts with hyphen', async () => {
			mockNodeParameters({
				operation: 'switchBranch',
				repositoryPath: '/repo',
				options: {},
				branchName: '-main',
			});

			await expect(gitNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
				'Reference cannot start with a hyphen',
			);

			expect(mockGit.checkout).not.toHaveBeenCalled();
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

			// Should use -- separator to prevent argument injection
			expect(mockGit.add).toHaveBeenCalledWith(['--', 'file.txt']);
			expect(result[0]).toEqual([{ json: { success: true }, pairedItem: { item: 0 } }]);
		});

		ALLOWED_CONFIG_KEYS.forEach((key) => {
			it(`should handle addConfig with key '${key}' operation`, async () => {
				mockExecuteFunctions.getNodeParameter
					.mockReturnValueOnce('addConfig')
					.mockReturnValueOnce('/repo')
					.mockReturnValueOnce({})
					.mockReturnValueOnce(key)
					.mockReturnValueOnce('test value');

				await gitNode.execute.call(mockExecuteFunctions);

				expect(mockGit.addConfig).toHaveBeenCalledWith(key, 'test value', false);
			});
		});

		describe('enableGitNodeAllConfigKeys is false (default value)', () => {
			[
				'core.sshCommand',
				'core.hooksPath',
				'credential.helper',
				'remote.origin.uploadpack',
				'remote.origin.receivepack',
				'url.xxx.insteadOf',
				'user.name,core.sshCommand',
			].forEach((key) => {
				it(`should reject addConfig with key '${key}'`, async () => {
					mockExecuteFunctions.getNodeParameter
						.mockReturnValueOnce('addConfig')
						.mockReturnValueOnce('/repo')
						.mockReturnValueOnce({})
						.mockReturnValueOnce(key)
						.mockReturnValueOnce('test value');

					await expect(gitNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
						`The provided git config key '${key}' is not allowed`,
					);
				});
			});
		});

		describe('enableGitNodeAllConfigKeys is true', () => {
			beforeEach(() => {
				const securityConfig = mock<SecurityConfig>({
					enableGitNodeAllConfigKeys: true,
				});
				Container.set(SecurityConfig, securityConfig);
			});

			[
				'core.sshCommand',
				'core.hooksPath',
				'credential.helper',
				'remote.origin.uploadpack',
				'remote.origin.receivepack',
				'url.xxx.insteadOf',
				'user.name,core.sshCommand',
			].forEach((key) => {
				it(`should handle addConfig with key '${key}'`, async () => {
					mockExecuteFunctions.getNodeParameter
						.mockReturnValueOnce('addConfig')
						.mockReturnValueOnce('/repo')
						.mockReturnValueOnce({})
						.mockReturnValueOnce(key)
						.mockReturnValueOnce('test value');

					await gitNode.execute.call(mockExecuteFunctions);

					expect(mockGit.addConfig).toHaveBeenCalledWith(key, 'test value', false);
				});
			});
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

		it('should handle clone operation and create the parent directory', async () => {
			const missingParentError = Object.assign(new Error('Directory does not exist'), {
				code: 'ENOENT',
			});

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('clone')
				.mockReturnValueOnce('/git/new-repo')
				.mockReturnValueOnce({})
				.mockReturnValueOnce('https://github.com/test/repo.git');

			mockExecuteFunctions.helpers.resolvePath = vi
				.fn()
				.mockRejectedValueOnce(missingParentError)
				.mockResolvedValueOnce('/git' as ResolvedFilePath);
			const result = await gitNode.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.resolvePath).toHaveBeenCalledWith('/git/new-repo');
			expect(mockExecuteFunctions.helpers.resolvePath).toHaveBeenCalledWith('/git');
			expect(mockSimpleGit).toHaveBeenCalledWith(expect.objectContaining({ baseDir: '/git' }));

			// The clone goes into an unguessable staging directory, not the target.
			const stagingPath = mockGit.clone.mock.calls[0][1] as unknown as string;
			expect(stagingPath).toMatch(CLONE_STAGING_RE);
			expect(mockMkdir).toHaveBeenCalledWith(stagingPath);
			expect(mockGit.clone).toHaveBeenCalledWith('https://github.com/test/repo.git', stagingPath, [
				'--',
			]);

			// The target is verified and then the staged clone is moved into place.
			expect(
				mockExecuteFunctions.helpers.ensureParentDirectoryWithoutFollowingSymlinks,
			).toHaveBeenCalledWith('/git/new-repo');
			expect(mockExecuteFunctions.helpers.assertNoSymlinkInPath).toHaveBeenCalledWith(
				'/git/new-repo',
			);
			expect(mockRename).toHaveBeenCalledWith(stagingPath, '/git/new-repo');
			expect(result[0]).toEqual([{ json: { success: true }, pairedItem: { item: 0 } }]);
		});

		it('should not create the parent directory when clone path is blocked', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('clone')
				.mockReturnValueOnce('/blocked/repo')
				.mockReturnValueOnce({});
			mockExecuteFunctions.helpers.isFilePathBlocked = vi.fn(() => true);

			await expect(gitNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
				'Access to the repository path is not allowed',
			);

			expect(
				mockExecuteFunctions.helpers.ensureParentDirectoryWithoutFollowingSymlinks,
			).not.toHaveBeenCalled();
			expect(mockSimpleGit).not.toHaveBeenCalled();
			expect(mockGit.clone).not.toHaveBeenCalled();
		});

		it('should move the staged clone to the resolved repository path', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('clone')
				.mockReturnValueOnce('/git/existing-repo')
				.mockReturnValueOnce({})
				.mockReturnValueOnce('https://github.com/test/repo.git');

			await gitNode.execute.call(mockExecuteFunctions);

			expect(
				mockExecuteFunctions.helpers.ensureParentDirectoryWithoutFollowingSymlinks,
			).toHaveBeenCalledWith('/git/existing-repo');
			expect(mockSimpleGit).toHaveBeenCalledWith(expect.objectContaining({ baseDir: '/git' }));
			const stagingPath = mockGit.clone.mock.calls[0][1] as unknown as string;
			expect(stagingPath).toMatch(CLONE_STAGING_RE);
			expect(mockGit.clone).toHaveBeenCalledWith('https://github.com/test/repo.git', stagingPath, [
				'--',
			]);
			expect(mockRename).toHaveBeenCalledWith(stagingPath, '/git/existing-repo');
		});

		it('should move the staged clone relative to the pinned parent directory when available', async () => {
			const pinnedClose = vi.fn(async () => {});
			mockExecuteFunctions.helpers.pinDirectory = vi.fn(async () => ({
				resolvePath: (name: string) => `/proc/self/fd/7/${name}`,
				close: pinnedClose,
			}));

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('clone')
				.mockReturnValueOnce('/git/new-repo')
				.mockReturnValueOnce({})
				.mockReturnValueOnce('https://github.com/test/repo.git');

			await gitNode.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.pinDirectory).toHaveBeenCalledWith('/git', {
				create: true,
			});
			// The path-string verification is skipped on the pinned branch.
			expect(
				mockExecuteFunctions.helpers.ensureParentDirectoryWithoutFollowingSymlinks,
			).not.toHaveBeenCalled();
			expect(mockExecuteFunctions.helpers.assertNoSymlinkInPath).not.toHaveBeenCalled();

			const stagingPath = mockGit.clone.mock.calls[0][1] as unknown as string;
			expect(mockRename).toHaveBeenCalledWith(stagingPath, '/proc/self/fd/7/new-repo');
			expect(pinnedClose).toHaveBeenCalled();
		});

		it('should surface a cross-filesystem error when the pinned rename fails with EXDEV', async () => {
			const pinnedClose = vi.fn(async () => {});
			mockExecuteFunctions.helpers.pinDirectory = vi.fn(async () => ({
				resolvePath: (name: string) => `/proc/self/fd/7/${name}`,
				close: pinnedClose,
			}));
			const exdevError = Object.assign(new Error('EXDEV'), { code: 'EXDEV' });
			mockRename.mockRejectedValueOnce(exdevError);

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('clone')
				.mockReturnValueOnce('/git/new-repo')
				.mockReturnValueOnce({})
				.mockReturnValueOnce('https://github.com/test/repo.git');

			await expect(gitNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
				'Cannot clone to a path on a different filesystem than the n8n data directory',
			);
			expect(pinnedClose).toHaveBeenCalled();
		});

		it('should not clone from a blocked local source repository path', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('clone')
				.mockReturnValueOnce('/git/new-repo')
				.mockReturnValueOnce({})
				.mockReturnValueOnce('/blocked/source-repo');
			mockExecuteFunctions.helpers.isFilePathBlocked = vi.fn(
				(path: string) => path === '/blocked/source-repo',
			);

			await expect(gitNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
				'Access to the source repository path is not allowed',
			);

			expect(
				mockExecuteFunctions.helpers.ensureParentDirectoryWithoutFollowingSymlinks,
			).not.toHaveBeenCalled();
			expect(mockSimpleGit).not.toHaveBeenCalled();
			expect(mockGit.clone).not.toHaveBeenCalled();
		});

		it('should check file URL source repository paths', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('clone')
				.mockReturnValueOnce('/git/new-repo')
				.mockReturnValueOnce({})
				.mockReturnValueOnce('file:/tmp/source-repo');

			await gitNode.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.resolvePath).toHaveBeenCalledWith('/tmp/source-repo');
			const stagingPath = mockGit.clone.mock.calls[0][1] as unknown as string;
			expect(stagingPath).toMatch(CLONE_STAGING_RE);
			expect(mockGit.clone).toHaveBeenCalledWith('file:/tmp/source-repo', stagingPath, ['--']);
			expect(mockRename).toHaveBeenCalledWith(stagingPath, '/git/new-repo');
		});

		it('should allow scp-style source repository references without a user', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('clone')
				.mockReturnValueOnce('/git/new-repo')
				.mockReturnValueOnce({})
				.mockReturnValueOnce('github.com:org/repo.git');

			await gitNode.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.resolvePath).toHaveBeenCalledTimes(1);
			expect(mockExecuteFunctions.helpers.resolvePath).toHaveBeenCalledWith('/git/new-repo');
			expect(mockGit.clone).toHaveBeenCalledWith(
				'github.com:org/repo.git',
				expect.stringMatching(CLONE_STAGING_RE),
				['--'],
			);
		});

		it('should reject clone source repositories starting with a hyphen', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('clone')
				.mockReturnValueOnce('/git/new-repo')
				.mockReturnValueOnce({})
				.mockReturnValueOnce('--upload-pack=git-upload-pack');

			await expect(gitNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
				'Source repository cannot start with a hyphen',
			);

			expect(
				mockExecuteFunctions.helpers.ensureParentDirectoryWithoutFollowingSymlinks,
			).not.toHaveBeenCalled();
			expect(mockSimpleGit).not.toHaveBeenCalled();
			expect(mockGit.clone).not.toHaveBeenCalled();
		});

		it.each(['ext::sh -c "id"', 'fd::17/foo'])(
			'should reject source repositories using a disallowed transport scheme (%s)',
			async (sourceRepository) => {
				mockExecuteFunctions.getNodeParameter
					.mockReturnValueOnce('clone')
					.mockReturnValueOnce('/git/new-repo')
					.mockReturnValueOnce({})
					.mockReturnValueOnce(sourceRepository);

				await expect(gitNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
					'Source repository protocol is not allowed',
				);

				expect(mockGit.clone).not.toHaveBeenCalled();
			},
		);

		it.each(['ssh://git@github.com/org/repo.git', 'git://github.com/org/repo.git'])(
			'should allow source repositories using an allowed transport scheme (%s)',
			async (sourceRepository) => {
				mockExecuteFunctions.getNodeParameter
					.mockReturnValueOnce('clone')
					.mockReturnValueOnce('/git/new-repo')
					.mockReturnValueOnce({})
					.mockReturnValueOnce(sourceRepository);

				await gitNode.execute.call(mockExecuteFunctions);

				expect(mockGit.clone).toHaveBeenCalledWith(
					sourceRepository,
					expect.stringMatching(CLONE_STAGING_RE),
					['--'],
				);
			},
		);

		it('should pass through source repositories that are not parseable URLs', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('clone')
				.mockReturnValueOnce('/git/new-repo')
				.mockReturnValueOnce({})
				.mockReturnValueOnce('http://[bad');

			await gitNode.execute.call(mockExecuteFunctions);

			expect(mockGit.clone).toHaveBeenCalledWith(
				'http://[bad',
				expect.stringMatching(CLONE_STAGING_RE),
				['--'],
			);
		});

		it('should restrict git transport protocols via the environment', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('clone')
				.mockReturnValueOnce('/git/new-repo')
				.mockReturnValueOnce({})
				.mockReturnValueOnce('https://github.com/test/repo.git');

			await gitNode.execute.call(mockExecuteFunctions);

			const envArg = mockGit.env.mock.calls[0][0] as Record<string, string>;
			expect(envArg.GIT_ALLOW_PROTOCOL).toBe('file:git:http:https:ssh');
		});

		it('should not place the repository when a target path component is a symlink', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('clone')
				.mockReturnValueOnce('/git/new-repo')
				.mockReturnValueOnce({})
				.mockReturnValueOnce('https://github.com/test/repo.git');
			mockExecuteFunctions.helpers.assertNoSymlinkInPath = vi
				.fn()
				.mockRejectedValue(new Error('Access to the file is not allowed.'));

			await expect(gitNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
				'Access to the file is not allowed.',
			);

			// The staged clone is never moved into the target, and the staging dir is removed.
			const stagingPath = mockGit.clone.mock.calls[0][1] as unknown as string;
			expect(stagingPath).toMatch(CLONE_STAGING_RE);
			expect(mockRename).not.toHaveBeenCalled();
			expect(mockRm).toHaveBeenCalledWith(stagingPath, { recursive: true, force: true });
		});

		it('should remove the staging directory when the clone fails', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('clone')
				.mockReturnValueOnce('/git/new-repo')
				.mockReturnValueOnce({})
				.mockReturnValueOnce('https://github.com/test/repo.git');
			mockGit.clone.mockRejectedValueOnce(new Error('clone failed'));

			await expect(gitNode.execute.call(mockExecuteFunctions)).rejects.toThrow('clone failed');

			const stagingPath = mockGit.clone.mock.calls[0][1] as unknown as string;
			expect(mockRename).not.toHaveBeenCalled();
			expect(mockRm).toHaveBeenCalledWith(stagingPath, { recursive: true, force: true });
		});

		it('should surface a clear error when the staged clone cannot be moved across filesystems', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('clone')
				.mockReturnValueOnce('/git/new-repo')
				.mockReturnValueOnce({})
				.mockReturnValueOnce('https://github.com/test/repo.git');
			mockRename.mockRejectedValueOnce(
				Object.assign(new Error('cross-device link'), { code: 'EXDEV' }),
			);

			await expect(gitNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
				'Cannot clone to a path on a different filesystem than the n8n data directory',
			);

			const stagingPath = mockGit.clone.mock.calls[0][1] as unknown as string;
			expect(mockRm).toHaveBeenCalledWith(stagingPath, { recursive: true, force: true });
		});

		it('should handle fetch operation', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('fetch')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({});

			await gitNode.execute.call(mockExecuteFunctions);

			expect(mockGit.fetch).toHaveBeenCalled();
		});

		it('should handle pull operation', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('pull')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({});

			await gitNode.execute.call(mockExecuteFunctions);

			expect(mockGit.pull).toHaveBeenCalled();
		});

		it('should handle log operation', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('log')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({})
				.mockReturnValueOnce(false) // returnAll
				.mockReturnValueOnce(10); // limit

			const mockLogData = [
				{ hash: 'abc123', message: 'test commit', author_name: 'John Doe' },
				{ hash: 'def456', message: 'another commit', author_name: 'Jane Smith' },
			];
			mockGit.log.mockResolvedValueOnce({ all: mockLogData } as any);

			const result = await gitNode.execute.call(mockExecuteFunctions);

			expect(mockGit.log).toHaveBeenCalledWith({ maxCount: 10 });
			expect(result[0]).toHaveLength(2);
			expect(result[0]).toEqual([
				{
					json: { hash: 'abc123', message: 'test commit', author_name: 'John Doe' },
					pairedItem: { item: 0 },
				},
				{
					json: { hash: 'def456', message: 'another commit', author_name: 'Jane Smith' },
					pairedItem: { item: 0 },
				},
			]);
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

		it('should handle reflog operation with default HEAD reference', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('reflog')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({}) // options - no custom reference
				.mockReturnValueOnce(false) // returnAll
				.mockReturnValueOnce(10); // limit

			const mockReflogOutput = `abc123 HEAD@{0}: commit: Update README
def456 HEAD@{1}: pull: Fast-forward
789xyz HEAD@{2}: checkout: moving from main to feature`;

			mockGit.raw.mockResolvedValueOnce(mockReflogOutput);

			const result = await gitNode.execute.call(mockExecuteFunctions);

			expect(mockGit.raw).toHaveBeenCalledWith(['reflog', 'HEAD']);
			expect(result[0]).toHaveLength(3);
			expect(result[0][0]).toEqual({
				json: {
					hash: 'abc123',
					ref: 'HEAD@{0}',
					action: 'commit',
					message: 'Update README',
					raw: 'abc123 HEAD@{0}: commit: Update README',
				},
				pairedItem: { item: 0 },
			});
		});

		it('should handle reflog operation with custom reference', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('reflog')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({ reference: 'main' }) // custom reference
				.mockReturnValueOnce(false) // returnAll
				.mockReturnValueOnce(10); // limit

			const mockReflogOutput = `abc123 main@{0}: commit: Feature complete
def456 main@{1}: commit: Initial commit`;

			mockGit.raw.mockResolvedValueOnce(mockReflogOutput);

			const result = await gitNode.execute.call(mockExecuteFunctions);

			expect(mockGit.raw).toHaveBeenCalledWith(['reflog', 'main']);
			expect(result[0]).toHaveLength(2);
		});

		it('should reject reflog with invalid reference to prevent argument injection', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('reflog')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({ reference: '-n' })
				.mockReturnValueOnce(false);

			await expect(gitNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
				'Reference cannot start with a hyphen',
			);

			expect(mockGit.raw).not.toHaveBeenCalled();
		});

		it('should handle reflog operation with limit', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('reflog')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({})
				.mockReturnValueOnce(false) // returnAll = false
				.mockReturnValueOnce(2); // limit = 2

			const mockReflogOutput = `abc123 HEAD@{0}: commit: First
def456 HEAD@{1}: commit: Second
789xyz HEAD@{2}: commit: Third
012abc HEAD@{3}: commit: Fourth`;

			mockGit.raw.mockResolvedValueOnce(mockReflogOutput);

			const result = await gitNode.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(2); // Should only return 2 entries
			expect(result[0][0].json.hash).toBe('abc123');
			expect(result[0][1].json.hash).toBe('def456');
		});

		it('should handle reflog operation with returnAll option', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('reflog')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({})
				.mockReturnValueOnce(true); // returnAll = true

			const mockReflogOutput = `abc123 HEAD@{0}: commit: First
def456 HEAD@{1}: commit: Second
789xyz HEAD@{2}: commit: Third
012abc HEAD@{3}: commit: Fourth`;

			mockGit.raw.mockResolvedValueOnce(mockReflogOutput);

			const result = await gitNode.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(4); // Should return all entries
		});

		it('should handle reflog with unparseable lines', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('reflog')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({})
				.mockReturnValueOnce(true); // returnAll

			const mockReflogOutput = `abc123 HEAD@{0}: commit: Valid entry
invalid line without proper format`;

			mockGit.raw.mockResolvedValueOnce(mockReflogOutput);

			const result = await gitNode.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(2);
			expect(result[0][0].json).toHaveProperty('hash');
			expect(result[0][1].json).toEqual({ raw: 'invalid line without proper format' });
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
					json: { error: 'Error: Create error' },
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
