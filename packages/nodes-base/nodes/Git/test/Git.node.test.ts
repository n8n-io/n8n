import { DeploymentConfig, SecurityConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, ResolvedFilePath } from 'n8n-workflow';
import { mkdir, rename, rm } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import simpleGit, { type SimpleGit } from 'simple-git';

import { Git } from '../Git.node';
import { ALLOWED_CONFIG_KEYS } from '../descriptions';

// Matches the unguessable staging directory the clone operation creates under the base.
const CLONE_STAGING_RE = /^[\\/]git[\\/]\.n8n-clone-[0-9a-f]{24}$/;
const GIT_ROOT_RE = /^[\\/]git$/;
const GIT_NEW_REPO_RE = /^[\\/]git[\\/]new-repo$/;

// Mock simple-git
const mockGit = {
	checkout: jest.fn(),
	checkoutBranch: jest.fn(),
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
	default: jest.fn(() => mockGit),
}));

const mockSimpleGit = jest.mocked(simpleGit);

// Mock filesystem operations used by the clone staging flow
jest.mock('node:fs/promises', () => ({
	...jest.requireActual('node:fs/promises'),
	mkdir: jest.fn(),
	rename: jest.fn(),
	rm: jest.fn(),
}));

const mockMkdir = jest.mocked(mkdir);
const mockRename = jest.mocked(rename);
const mockRm = jest.mocked(rm);

describe('Git Node', () => {
	let gitNode: Git;
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let deploymentConfig: jest.Mocked<DeploymentConfig>;
	let securityConfig: jest.Mocked<SecurityConfig>;

	beforeEach(() => {
		jest.clearAllMocks();
		gitNode = new Git();
		deploymentConfig = mock<DeploymentConfig>({
			type: 'default',
		});
		securityConfig = mock<SecurityConfig>({
			disableBareRepos: false,
			enableGitNodeHooks: true,
			enableGitNodeAllConfigKeys: false,
		});
		Container.set(DeploymentConfig, deploymentConfig);
		Container.set(SecurityConfig, securityConfig);
		mockExecuteFunctions = mock<IExecuteFunctions>({
			getInputData: jest.fn(() => [{ json: {} }]),
			getNodeParameter: jest.fn(),
			continueOnFail: jest.fn(() => false),
			helpers: {
				returnJsonArray: jest.fn((data: any[]) => data.map((item: any) => ({ json: item }))),
				resolvePath: jest.fn(async (path: string) => path as any),
				isFilePathBlocked: jest.fn(() => false),
				assertNoSymlinkInPath: jest.fn(async () => {}),
				ensureParentDirectoryWithoutFollowingSymlinks: jest.fn(async () => {}),
				resolveStagingBaseForTarget: jest.fn(
					async (target: string) => dirname(target) as ResolvedFilePath,
				),
				pinDirectory: jest.fn(async () => null),
			},
		});
		mockExecuteFunctions.getNodeParameter.mockImplementation(
			(name: string, _itemIndex: number, fallbackValue?: unknown) => {
				switch (name) {
					case 'operation':
						return 'log';
					case 'repositoryPath':
						return '/repo';
					case 'options':
						return {};
					default:
						return fallbackValue ?? '';
				}
			},
		);
		mockGit.listConfig.mockResolvedValue({ values: {} } as any);
		mockGit.log.mockResolvedValue({ all: [] } as any);
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

	describe('Bare repository configuration', () => {
		it('should add safe.bareRepository=explicit when deployment type is cloud', async () => {
			deploymentConfig.type = 'cloud';
			securityConfig.disableBareRepos = false;

			await gitNode.execute.call(mockExecuteFunctions);

			expect(mockSimpleGit).toHaveBeenCalledWith(
				expect.objectContaining({
					config: ['safe.bareRepository=explicit'],
				}),
			);
		});

		it('should add safe.bareRepository=explicit when disableBareRepos is true', async () => {
			deploymentConfig.type = 'default';
			securityConfig.disableBareRepos = true;

			await gitNode.execute.call(mockExecuteFunctions);

			expect(mockSimpleGit).toHaveBeenCalledWith(
				expect.objectContaining({
					config: ['safe.bareRepository=explicit'],
				}),
			);
		});

		it('should add safe.bareRepository=explicit when both cloud and disableBareRepos are true', async () => {
			deploymentConfig.type = 'cloud';
			securityConfig.disableBareRepos = true;

			await gitNode.execute.call(mockExecuteFunctions);

			expect(mockSimpleGit).toHaveBeenCalledWith(
				expect.objectContaining({
					config: ['safe.bareRepository=explicit'],
				}),
			);
		});

		it('should not add safe.bareRepository=explicit when neither cloud nor disableBareRepos is true', async () => {
			deploymentConfig.type = 'default';
			securityConfig.disableBareRepos = false;

			await gitNode.execute.call(mockExecuteFunctions);

			expect(mockSimpleGit).toHaveBeenCalledWith(
				expect.objectContaining({
					config: [],
				}),
			);
		});
	});

	describe('Hooks configuration', () => {
		it('should add core.hooksPath=/dev/null when enableGitNodeHooks is false', async () => {
			securityConfig.enableGitNodeHooks = false;

			await gitNode.execute.call(mockExecuteFunctions);

			expect(mockSimpleGit).toHaveBeenCalledWith(
				expect.objectContaining({
					config: ['core.hooksPath=/dev/null'],
				}),
			);
		});

		it('should opt into allowUnsafeHooksPath when enableGitNodeHooks is false', async () => {
			securityConfig.enableGitNodeHooks = false;

			await gitNode.execute.call(mockExecuteFunctions);

			expect(mockSimpleGit).toHaveBeenCalledWith(
				expect.objectContaining({
					unsafe: { allowUnsafeHooksPath: true },
				}),
			);
		});

		it('should not add core.hooksPath=/dev/null when enableGitNodeHooks is true', async () => {
			securityConfig.enableGitNodeHooks = true;

			await gitNode.execute.call(mockExecuteFunctions);

			expect(mockSimpleGit).toHaveBeenCalledWith(
				expect.objectContaining({
					config: [],
				}),
			);
		});

		it('should not opt into allowUnsafeHooksPath when enableGitNodeHooks is true', async () => {
			securityConfig.enableGitNodeHooks = true;

			await gitNode.execute.call(mockExecuteFunctions);

			const options = mockSimpleGit.mock.calls[0][0] as { unsafe?: unknown };
			expect(options.unsafe).toBeUndefined();
		});
	});

	describe('Restricted file paths', () => {
		it('should throw an error if the repository path is blocked', async () => {
			mockExecuteFunctions.helpers.isFilePathBlocked = jest.fn(() => true);
			mockExecuteFunctions.helpers.resolvePath = jest.fn(
				async () => '/tmp/test-repo' as ResolvedFilePath,
			);

			await expect(gitNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
				'Access to the repository path is not allowed',
			);
		});

		it('should use the resolved repository path for git operations', async () => {
			const originalPath = '/tmp/link-to-repo';
			const resolvedPath = '/tmp/actual-repo';
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(name: string, _itemIndex: number, fallbackValue?: unknown) => {
					switch (name) {
						case 'operation':
							return 'log';
						case 'repositoryPath':
							return originalPath;
						case 'options':
							return {};
						default:
							return fallbackValue ?? '';
					}
				},
			);
			mockExecuteFunctions.helpers.resolvePath = jest.fn(
				async () => resolvedPath as ResolvedFilePath,
			);
			mockExecuteFunctions.helpers.isFilePathBlocked = jest.fn(() => false);

			await gitNode.execute.call(mockExecuteFunctions);

			expect(mockSimpleGit).toHaveBeenCalledWith(
				expect.objectContaining({
					baseDir: resolvedPath,
				}),
			);
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
			mockExecuteFunctions.helpers.isFilePathBlocked = jest.fn(
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
			mockExecuteFunctions.helpers.isFilePathBlocked = jest.fn(
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
			mockExecuteFunctions.helpers.isFilePathBlocked = jest.fn(
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
			mockExecuteFunctions.helpers.isFilePathBlocked = jest.fn(
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

		describe('Configured remotes', () => {
			const expectRemoteOperationNotCalled = (operation: 'fetch' | 'pull' | 'pushTags') => {
				if (operation === 'fetch') {
					expect(mockGit.fetch).not.toHaveBeenCalled();
				} else if (operation === 'pull') {
					expect(mockGit.pull).not.toHaveBeenCalled();
				} else {
					expect(mockGit.pushTags).not.toHaveBeenCalled();
				}
			};

			it('should validate remote.origin.url before writing git config', async () => {
				mockExecuteFunctions.getNodeParameter
					.mockReturnValueOnce('addConfig')
					.mockReturnValueOnce('/repo')
					.mockReturnValueOnce({})
					.mockReturnValueOnce('remote.origin.url')
					.mockReturnValueOnce('/outside/repo');
				mockExecuteFunctions.helpers.isFilePathBlocked = jest.fn(
					(path: string) => path === '/outside/repo',
				);

				await expect(gitNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
					'Access to the source repository path is not allowed',
				);

				expect(mockGit.addConfig).not.toHaveBeenCalled();
			});

			it('should validate remote.origin.pushurl before writing git config when custom keys are enabled', async () => {
				Container.set(
					SecurityConfig,
					mock<SecurityConfig>({
						enableGitNodeAllConfigKeys: true,
					}),
				);
				mockExecuteFunctions.getNodeParameter
					.mockReturnValueOnce('addConfig')
					.mockReturnValueOnce('/repo')
					.mockReturnValueOnce({})
					.mockReturnValueOnce('remote.origin.pushurl')
					.mockReturnValueOnce('/outside/repo');
				mockExecuteFunctions.helpers.isFilePathBlocked = jest.fn(
					(path: string) => path === '/outside/repo',
				);

				await expect(gitNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
					'Access to the target repository path is not allowed',
				);

				expect(mockGit.addConfig).not.toHaveBeenCalled();
			});

			it.each([
				{ key: 'remote.upstream.url', repositoryType: 'source' },
				{ key: 'remote.upstream.pushurl', repositoryType: 'target' },
				{ key: 'remote.team.upstream.url', repositoryType: 'source' },
				{ key: 'remote.team.upstream.pushurl', repositoryType: 'target' },
				{ key: 'remote.upstream.URL', repositoryType: 'source' },
				{ key: 'remote.upstream.PushURL', repositoryType: 'target' },
			])(
				'should validate $key before writing git config when custom keys are enabled',
				async ({ key, repositoryType }) => {
					Container.set(
						SecurityConfig,
						mock<SecurityConfig>({
							enableGitNodeAllConfigKeys: true,
						}),
					);
					mockExecuteFunctions.getNodeParameter
						.mockReturnValueOnce('addConfig')
						.mockReturnValueOnce('/repo')
						.mockReturnValueOnce({})
						.mockReturnValueOnce(key)
						.mockReturnValueOnce('/outside/repo');
					mockExecuteFunctions.helpers.isFilePathBlocked = jest.fn(
						(path: string) => path === '/outside/repo',
					);

					await expect(gitNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
						`Access to the ${repositoryType} repository path is not allowed`,
					);

					expect(mockGit.addConfig).not.toHaveBeenCalled();
				},
			);

			it.each([
				{ operation: 'fetch' as const, configKey: 'remote.origin.url', repositoryType: 'source' },
				{
					operation: 'fetch' as const,
					configKey: 'remote.upstream.url',
					repositoryType: 'source',
				},
				{ operation: 'pull' as const, configKey: 'remote.origin.url', repositoryType: 'source' },
				{
					operation: 'pull' as const,
					configKey: 'remote.upstream.url',
					repositoryType: 'source',
				},
				{
					operation: 'pushTags' as const,
					configKey: 'remote.origin.url',
					repositoryType: 'target',
				},
				{
					operation: 'pushTags' as const,
					configKey: 'remote.origin.pushurl',
					repositoryType: 'target',
				},
				{
					operation: 'pushTags' as const,
					configKey: 'remote.upstream.pushurl',
					repositoryType: 'target',
				},
			])(
				'should validate configured $configKey before $operation',
				async ({ operation, configKey, repositoryType }) => {
					mockExecuteFunctions.getNodeParameter
						.mockReturnValueOnce(operation)
						.mockReturnValueOnce('/repo')
						.mockReturnValueOnce({});
					mockGit.listConfig.mockResolvedValueOnce({
						values: {
							'.git/config': {
								'remote.origin.url': 'https://github.com/test/repo.git',
								[configKey]: '/outside/repo',
							},
						},
					} as any);
					mockExecuteFunctions.helpers.isFilePathBlocked = jest.fn(
						(path: string) => path === '/outside/repo',
					);

					await expect(gitNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
						`Access to the ${repositoryType} repository path is not allowed`,
					);

					expectRemoteOperationNotCalled(operation);
				},
			);

			it.each(['fetch' as const, 'pull' as const])(
				'should not validate configured push URLs before %s',
				async (operation) => {
					mockExecuteFunctions.getNodeParameter
						.mockReturnValueOnce(operation)
						.mockReturnValueOnce('/repo')
						.mockReturnValueOnce({});
					mockGit.listConfig.mockResolvedValueOnce({
						values: {
							'.git/config': {
								'remote.origin.url': 'https://github.com/test/repo.git',
								'remote.origin.pushurl': '/outside/repo',
							},
						},
					} as any);
					mockExecuteFunctions.helpers.isFilePathBlocked = jest.fn(
						(path: string) => path === '/outside/repo',
					);

					await gitNode.execute.call(mockExecuteFunctions);

					if (operation === 'fetch') {
						expect(mockGit.fetch).toHaveBeenCalled();
					} else {
						expect(mockGit.pull).toHaveBeenCalled();
					}
				},
			);

			it('should validate non-origin remotes before default push', async () => {
				mockExecuteFunctions.getNodeParameter
					.mockReturnValueOnce('push')
					.mockReturnValueOnce('/repo')
					.mockReturnValueOnce({})
					.mockReturnValueOnce('none');
				mockGit.listConfig.mockResolvedValueOnce({
					values: {
						'.git/config': {
							'remote.origin.url': 'https://github.com/test/repo.git',
							'remote.upstream.pushurl': '/outside/repo',
						},
					},
				} as any);
				mockExecuteFunctions.helpers.isFilePathBlocked = jest.fn(
					(path: string) => path === '/outside/repo',
				);

				await expect(gitNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
					'Access to the target repository path is not allowed',
				);

				expect(mockGit.push).not.toHaveBeenCalled();
			});

			it('should prefer push URLs over source URLs when validating default push targets', async () => {
				mockExecuteFunctions.getNodeParameter
					.mockReturnValueOnce('push')
					.mockReturnValueOnce('/repo')
					.mockReturnValueOnce({})
					.mockReturnValueOnce('none');
				mockGit.listConfig.mockResolvedValueOnce({
					values: {
						'.git/config': {
							'remote.origin.url': '/outside/source-repo',
							'remote.origin.pushurl': 'https://github.com/test/push-repo.git',
						},
					},
				} as any);
				mockExecuteFunctions.helpers.isFilePathBlocked = jest.fn(
					(path: string) => path === '/outside/source-repo',
				);

				await gitNode.execute.call(mockExecuteFunctions);

				expect(mockGit.push).toHaveBeenCalled();
			});
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

			mockExecuteFunctions.helpers.resolvePath = jest
				.fn()
				.mockRejectedValueOnce(missingParentError)
				.mockResolvedValueOnce('/git' as ResolvedFilePath);
			const result = await gitNode.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.resolvePath).toHaveBeenCalledWith('/git/new-repo');
			expect(mockExecuteFunctions.helpers.resolvePath).toHaveBeenCalledWith('/git');
			expect(mockSimpleGit).toHaveBeenCalledWith(
				expect.objectContaining({ baseDir: expect.stringMatching(GIT_ROOT_RE) }),
			);

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
			).toHaveBeenCalledWith(expect.stringMatching(GIT_NEW_REPO_RE));
			expect(mockExecuteFunctions.helpers.assertNoSymlinkInPath).toHaveBeenCalledWith(
				expect.stringMatching(GIT_NEW_REPO_RE),
			);
			expect(mockRename).toHaveBeenCalledWith(stagingPath, expect.stringMatching(GIT_NEW_REPO_RE));
			expect(result[0]).toEqual([{ json: { success: true }, pairedItem: { item: 0 } }]);
		});

		it('should not create the parent directory when clone path is blocked', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('clone')
				.mockReturnValueOnce('/blocked/repo')
				.mockReturnValueOnce({});
			mockExecuteFunctions.helpers.isFilePathBlocked = jest.fn(() => true);

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
			expect(mockSimpleGit).toHaveBeenCalledWith(
				expect.objectContaining({ baseDir: expect.stringMatching(GIT_ROOT_RE) }),
			);
			const stagingPath = mockGit.clone.mock.calls[0][1] as unknown as string;
			expect(stagingPath).toMatch(CLONE_STAGING_RE);
			expect(mockGit.clone).toHaveBeenCalledWith('https://github.com/test/repo.git', stagingPath, [
				'--',
			]);
			expect(mockRename).toHaveBeenCalledWith(stagingPath, '/git/existing-repo');
		});

		it('should move the staged clone relative to the pinned parent directory when available', async () => {
			const pinnedClose = jest.fn(async () => {});
			mockExecuteFunctions.helpers.pinDirectory = jest.fn(async () => ({
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
			const pinnedClose = jest.fn(async () => {});
			mockExecuteFunctions.helpers.pinDirectory = jest.fn(async () => ({
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
			mockExecuteFunctions.helpers.isFilePathBlocked = jest.fn(
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

		it('should not treat Unix local source repository paths with colons as scp-style remotes', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('clone')
				.mockReturnValueOnce('/git/new-repo')
				.mockReturnValueOnce({})
				.mockReturnValueOnce('/blocked/source:repo');
			mockExecuteFunctions.helpers.isFilePathBlocked = jest.fn(
				(path: string) => path === '/blocked/source:repo',
			);

			await expect(gitNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
				'Access to the source repository path is not allowed',
			);

			expect(mockSimpleGit).not.toHaveBeenCalled();
			expect(mockGit.clone).not.toHaveBeenCalled();
		});

		it('should keep validating Windows local source repository paths', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('clone')
				.mockReturnValueOnce('/git/new-repo')
				.mockReturnValueOnce({})
				.mockReturnValueOnce('C:\\blocked\\source-repo');
			mockExecuteFunctions.helpers.resolvePath = jest.fn(
				async (path: string) => path as ResolvedFilePath,
			);
			mockExecuteFunctions.helpers.isFilePathBlocked = jest.fn((path: string) =>
				path.includes('C:\\blocked\\source-repo'),
			);

			await expect(gitNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
				'Access to the source repository path is not allowed',
			);

			expect(mockSimpleGit).not.toHaveBeenCalled();
			expect(mockGit.clone).not.toHaveBeenCalled();
		});

		it('should check file URL source repository paths', async () => {
			const sourcePath = resolve(sep, 'tmp', 'source-repo');
			const sourceRepository = pathToFileURL(sourcePath).href;

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('clone')
				.mockReturnValueOnce('/git/new-repo')
				.mockReturnValueOnce({})
				.mockReturnValueOnce(sourceRepository);

			await gitNode.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.resolvePath).toHaveBeenCalledWith(sourcePath);
			const stagingPath = mockGit.clone.mock.calls[0][1] as unknown as string;
			expect(stagingPath).toMatch(CLONE_STAGING_RE);
			expect(mockGit.clone).toHaveBeenCalledWith(sourceRepository, stagingPath, ['--']);
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

		it('should reject malformed scp-like source repository references with extra at signs', async () => {
			const sourceRepository = 'git@malformed@github.com:org/repo.git';
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('clone')
				.mockReturnValueOnce('/git/new-repo')
				.mockReturnValueOnce({})
				.mockReturnValueOnce(sourceRepository);
			mockExecuteFunctions.helpers.isFilePathBlocked = jest.fn((path: string) =>
				path.includes('git@malformed@github.com:org'),
			);

			await expect(gitNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
				'Access to the source repository path is not allowed',
			);

			expect(mockSimpleGit).not.toHaveBeenCalled();
			expect(mockGit.clone).not.toHaveBeenCalled();
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

		it.each(['push', 'pushTags'])(
			'should disable the file transport for %s when hooks are disabled',
			async (operation) => {
				securityConfig.enableGitNodeHooks = false;
				mockExecuteFunctions.getNodeParameter
					.mockReturnValueOnce(operation)
					.mockReturnValueOnce('/repo')
					.mockReturnValueOnce({});

				await gitNode.execute.call(mockExecuteFunctions);

				const envArg = mockGit.env.mock.calls[0][0] as Record<string, string>;
				expect(envArg.GIT_ALLOW_PROTOCOL).toBe('git:http:https:ssh');
			},
		);

		it('should not place the repository when a target path component is a symlink', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('clone')
				.mockReturnValueOnce('/git/new-repo')
				.mockReturnValueOnce({})
				.mockReturnValueOnce('https://github.com/test/repo.git');
			mockExecuteFunctions.helpers.assertNoSymlinkInPath = jest
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
	});

	describe('Tag reference validation', () => {
		it('should accept tag operation when name contains a plus sign', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('tag')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({})
				.mockReturnValueOnce('v1.2.3+build.1');

			await gitNode.execute.call(mockExecuteFunctions);

			expect(mockGit.addTag).toHaveBeenCalledWith('v1.2.3+build.1');
		});

		it('should reject tag operation when name starts with a hyphen', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('tag')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({})
				.mockReturnValueOnce('--force');

			await expect(gitNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
				'Reference cannot start with a hyphen',
			);

			expect(mockGit.addTag).not.toHaveBeenCalled();
		});

		it('should reject tag operation when name contains unsafe characters', async () => {
			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('tag')
				.mockReturnValueOnce('/repo')
				.mockReturnValueOnce({})
				.mockReturnValueOnce('v1;id');

			await expect(gitNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
				'Reference contains unsafe characters',
			);

			expect(mockGit.addTag).not.toHaveBeenCalled();
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
