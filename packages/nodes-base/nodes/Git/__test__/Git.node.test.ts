import { DeploymentConfig, SecurityConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import type { SimpleGit } from 'simple-git';
import simpleGit from 'simple-git';

import { Git } from '../Git.node';
import type { Mock, Mocked, MockedFunction } from 'vitest';

const mockGit = {
	log: vi.fn(),
	env: vi.fn().mockReturnThis(),
};

vi.mock('simple-git');
const mockSimpleGit = simpleGit as MockedFunction<typeof simpleGit>;
mockSimpleGit.mockReturnValue(mockGit as unknown as SimpleGit);

describe('Git Node', () => {
	let gitNode: Git;
	let executeFunctions: Mocked<IExecuteFunctions>;
	let deploymentConfig: Mocked<DeploymentConfig>;
	let securityConfig: Mocked<SecurityConfig>;

	beforeEach(() => {
		vi.clearAllMocks();

		deploymentConfig = mock<DeploymentConfig>({
			type: 'default',
		});
		securityConfig = mock<SecurityConfig>({
			disableBareRepos: false,
			enableGitNodeHooks: true,
		});
		Container.set(DeploymentConfig, deploymentConfig);
		Container.set(SecurityConfig, securityConfig);

		executeFunctions = mock<IExecuteFunctions>({
			getInputData: vi.fn().mockReturnValue([{ json: {} }]),
			getNodeParameter: vi.fn(),
			helpers: {
				isFilePathBlocked: vi.fn(),
				returnJsonArray: vi
					.fn()
					.mockImplementation((data: unknown[]) => data.map((item: unknown) => ({ json: item }))),
			},
		});
		executeFunctions.getNodeParameter.mockImplementation((name: string) => {
			switch (name) {
				case 'operation':
					return 'log';
				case 'repositoryPath':
					return '/tmp/test-repo';
				case 'options':
					return {};
				default:
					return '';
			}
		});

		mockGit.log.mockResolvedValue({ all: [] });

		gitNode = new Git();
	});

	describe('Bare Repository Configuration', () => {
		it('should add safe.bareRepository=explicit when deployment type is cloud', async () => {
			deploymentConfig.type = 'cloud';
			securityConfig.disableBareRepos = false;

			await gitNode.execute.call(executeFunctions);

			expect(mockSimpleGit).toHaveBeenCalledWith(
				expect.objectContaining({
					config: ['safe.bareRepository=explicit'],
				}),
			);
		});

		it('should add safe.bareRepository=explicit when disableBareRepos is true', async () => {
			deploymentConfig.type = 'default';
			securityConfig.disableBareRepos = true;

			await gitNode.execute.call(executeFunctions);

			expect(mockSimpleGit).toHaveBeenCalledWith(
				expect.objectContaining({
					config: ['safe.bareRepository=explicit'],
				}),
			);
		});

		it('should add safe.bareRepository=explicit when both cloud and disableBareRepos are true', async () => {
			deploymentConfig.type = 'cloud';
			securityConfig.disableBareRepos = true;

			await gitNode.execute.call(executeFunctions);

			expect(mockSimpleGit).toHaveBeenCalledWith(
				expect.objectContaining({
					config: ['safe.bareRepository=explicit'],
				}),
			);
		});

		it('should not add safe.bareRepository=explicit when neither cloud nor disableBareRepos is true', async () => {
			deploymentConfig.type = 'default';
			securityConfig.disableBareRepos = false;

			await gitNode.execute.call(executeFunctions);

			expect(mockSimpleGit).toHaveBeenCalledWith(
				expect.objectContaining({
					config: [],
				}),
			);
		});
	});

	describe('Hooks Configuration', () => {
		it('should add core.hooksPath=/dev/null when enableGitNodeHooks is false', async () => {
			securityConfig.enableGitNodeHooks = false;

			await gitNode.execute.call(executeFunctions);

			expect(mockSimpleGit).toHaveBeenCalledWith(
				expect.objectContaining({
					config: ['core.hooksPath=/dev/null'],
				}),
			);
		});

		it('should opt into allowUnsafeHooksPath when enableGitNodeHooks is false', async () => {
			securityConfig.enableGitNodeHooks = false;

			await gitNode.execute.call(executeFunctions);

			expect(mockSimpleGit).toHaveBeenCalledWith(
				expect.objectContaining({
					unsafe: { allowUnsafeHooksPath: true },
				}),
			);
		});

		it('should not add core.hooksPath=/dev/null when enableGitNodeHooks is true', async () => {
			securityConfig.enableGitNodeHooks = true;

			await gitNode.execute.call(executeFunctions);

			expect(mockSimpleGit).toHaveBeenCalledWith(
				expect.objectContaining({
					config: [],
				}),
			);
		});

		it('should not opt into allowUnsafeHooksPath when enableGitNodeHooks is true', async () => {
			securityConfig.enableGitNodeHooks = true;

			await gitNode.execute.call(executeFunctions);

			const options = mockSimpleGit.mock.calls[0][0] as { unsafe?: unknown };
			expect(options.unsafe).toBeUndefined();
		});
	});

	describe('Restricted file paths', () => {
		it('should throw an error if the repository path is blocked', async () => {
			(executeFunctions.helpers.isFilePathBlocked as Mock).mockReturnValue(true);
			(executeFunctions.helpers.resolvePath as Mock).mockResolvedValue('/tmp/test-repo');

			await expect(gitNode.execute.call(executeFunctions)).rejects.toThrow(
				'Access to the repository path is not allowed',
			);
		});

		it('should use the resolved repository path for git operations', async () => {
			const originalPath = '/tmp/link-to-repo';
			const resolvedPath = '/tmp/actual-repo';

			executeFunctions.getNodeParameter.mockImplementation((name: string) => {
				switch (name) {
					case 'operation':
						return 'log';
					case 'repositoryPath':
						return originalPath;
					case 'options':
						return {};
					default:
						return '';
				}
			});

			(executeFunctions.helpers.resolvePath as Mock).mockResolvedValue(resolvedPath);
			(executeFunctions.helpers.isFilePathBlocked as Mock).mockReturnValue(false);

			await gitNode.execute.call(executeFunctions);

			// Verify git is initialized with the resolved path, not the original
			expect(mockSimpleGit).toHaveBeenCalledWith(
				expect.objectContaining({
					baseDir: resolvedPath,
				}),
			);
		});
	});
});
