import { DeploymentConfig, SecurityConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import type { SimpleGit } from 'simple-git';
import simpleGit from 'simple-git';

import { Git } from '../Git.node';

const mockGit = {
	log: jest.fn(),
	env: jest.fn().mockReturnThis(),
};

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
		});
		Container.set(DeploymentConfig, deploymentConfig);
		Container.set(SecurityConfig, securityConfig);

		executeFunctions = mock<IExecuteFunctions>({
			getInputData: jest.fn().mockReturnValue([{ json: {} }]),
			getNodeParameter: jest.fn(),
			helpers: {
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
});
