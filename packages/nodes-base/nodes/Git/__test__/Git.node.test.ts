import { DeploymentConfig, SecurityConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, ResolvedFilePath } from 'n8n-workflow';
import type { PathLike } from 'node:fs';
import type { SimpleGit } from 'simple-git';
import simpleGit from 'simple-git';

import { Git } from '../Git.node';

const mockGit = {
	log: jest.fn(),
	raw: jest.fn(),
	env: jest.fn().mockReturnThis(),
};

const REPOSITORY_PATH = '/tmp/test-repo';

// `git rev-parse --show-toplevel --absolute-git-dir --git-common-dir`, which the node asks
// for before it resolves any repository reference.
const revParseOutput = `${REPOSITORY_PATH}\n${REPOSITORY_PATH}/.git\n${REPOSITORY_PATH}/.git\n`;

jest.mock('simple-git');
const mockSimpleGit = simpleGit as jest.MockedFunction<typeof simpleGit>;
mockSimpleGit.mockReturnValue(mockGit as unknown as SimpleGit);

describe('Git Node', () => {
	let gitNode: Git;
	let executeFunctions: jest.Mocked<IExecuteFunctions>;
	let deploymentConfig: jest.Mocked<DeploymentConfig>;
	let securityConfig: jest.Mocked<SecurityConfig>;

	beforeEach(() => {
		jest.clearAllMocks();

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
			getInputData: jest.fn().mockReturnValue([{ json: {} }]),
			getNodeParameter: jest.fn(),
			helpers: {
				isFilePathBlocked: jest.fn(),
				resolvePath: jest.fn(async (path: PathLike) => path.toString() as ResolvedFilePath),
				returnJsonArray: jest
					.fn()
					.mockImplementation((data: unknown[]) => data.map((item: unknown) => ({ json: item }))),
			},
		});
		executeFunctions.getNodeParameter.mockImplementation((name: string) => {
			switch (name) {
				case 'operation':
					return 'log';
				case 'repositoryPath':
					return REPOSITORY_PATH;
				case 'options':
					return {};
				default:
					return '';
			}
		});

		mockGit.log.mockResolvedValue({ all: [] });
		mockGit.raw.mockImplementation(async (args: string[]) =>
			args[0] === 'rev-parse' ? revParseOutput : '',
		);

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

		it('should not add core.hooksPath=/dev/null when enableGitNodeHooks is true', async () => {
			securityConfig.enableGitNodeHooks = true;

			await gitNode.execute.call(executeFunctions);

			expect(mockSimpleGit).toHaveBeenCalledWith(
				expect.objectContaining({
					config: [],
				}),
			);
		});
	});

	describe('Command config neutralization', () => {
		const expectedOverrides = [
			'core.sshCommand=ssh',
			'core.fsmonitor=false',
			'core.pager=cat',
			'diff.external=true',
			'credential.helper=',
			'core.gitProxy=none',
			'gpg.program=gpg',
			'init.templateDir=',
		];
		const expectedFlags = [
			'allowUnsafeSshCommand',
			'allowUnsafeFsMonitor',
			'allowUnsafePager',
			'allowUnsafeDiffExternal',
			'allowUnsafeCredentialHelper',
			'allowUnsafeGitProxy',
			'allowUnsafeGpgProgram',
			'allowUnsafeTemplateDir',
		];

		const getOptions = () =>
			mockSimpleGit.mock.calls[0][0] as { config?: string[]; unsafe?: Record<string, boolean> };

		it('pins command-related git config to safe defaults', async () => {
			securityConfig.enableGitNodeAllConfigKeys = false;

			await gitNode.execute.call(executeFunctions);

			const { config, unsafe } = getOptions();
			expect(config).toEqual(expect.arrayContaining(expectedOverrides));
			for (const flag of expectedFlags) {
				expect(unsafe?.[flag]).toBe(true);
			}
		});

		it('does not pin command config when enableGitNodeAllConfigKeys is true', async () => {
			securityConfig.enableGitNodeAllConfigKeys = true;

			await gitNode.execute.call(executeFunctions);

			const { config, unsafe } = getOptions();
			for (const override of expectedOverrides) {
				expect(config).not.toContain(override);
			}
			for (const flag of expectedFlags) {
				expect(unsafe?.[flag]).toBeUndefined();
			}
		});
	});

	describe('Restricted file paths', () => {
		it('should throw an error if the repository path is blocked', async () => {
			(executeFunctions.helpers.isFilePathBlocked as jest.Mock).mockReturnValue(true);
			(executeFunctions.helpers.resolvePath as jest.Mock).mockResolvedValue(REPOSITORY_PATH);

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

			(executeFunctions.helpers.resolvePath as jest.Mock).mockResolvedValue(resolvedPath);
			(executeFunctions.helpers.isFilePathBlocked as jest.Mock).mockReturnValue(false);

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
