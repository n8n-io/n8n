import { DeploymentConfig, SecurityConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { IExecuteFunctions, ResolvedFilePath } from 'n8n-workflow';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';

import { Git } from '../Git.node';

// Unlike Git.node.test.ts, this suite intentionally does NOT mock simple-git or the
// filesystem: it runs real git against a throwaway repository so it exercises how the
// node actually handles repository-local git config end to end.

const gitConfig = (repo: string, key: string, value: string) =>
	execFileSync('git', ['-C', repo, 'config', key, value]);

describe('Git Node command-config handling', () => {
	let gitNode: Git;
	let repoDir: string;
	let marker: string;

	const buildContext = (
		operation: string,
		repositoryPath: string,
	): MockProxy<IExecuteFunctions> => {
		const ctx = mock<IExecuteFunctions>({
			getInputData: jest.fn(() => [{ json: {} }]),
			// Swallow the expected network failure so we can assert on the side effect.
			continueOnFail: jest.fn(() => true),
			getNodeParameter: jest.fn(),
			helpers: {
				returnJsonArray: jest.fn((data: any[]) => data.map((item: any) => ({ json: item }))),
				resolvePath: jest.fn(async (path: string) => path as ResolvedFilePath),
				isFilePathBlocked: jest.fn(() => false),
			},
		});
		ctx.getNodeParameter.mockImplementation(
			(name: string, _itemIndex: number, fallbackValue?: unknown) => {
				switch (name) {
					case 'operation':
						return operation;
					case 'repositoryPath':
						return repositoryPath;
					case 'options':
						return {};
					default:
						return fallbackValue ?? '';
				}
			},
		);
		return ctx;
	};

	beforeEach(async () => {
		gitNode = new Git();
		Container.set(DeploymentConfig, mock<DeploymentConfig>({ type: 'default' }));
		Container.set(
			SecurityConfig,
			mock<SecurityConfig>({
				disableBareRepos: true,
				enableGitNodeHooks: false,
				enableGitNodeAllConfigKeys: false,
			}),
		);
		repoDir = await mkdtemp(join(tmpdir(), 'n8n-git-cfg-'));
		marker = join(repoDir, 'command-ran');
		execFileSync('git', ['init', '-q', repoDir]);
		gitConfig(repoDir, 'user.email', 'test@example.com');
		gitConfig(repoDir, 'user.name', 'Test');
	});

	afterEach(async () => {
		await rm(repoDir, { recursive: true, force: true });
	});

	it('does not run command-bearing repo-local git config on fetch', async () => {
		// A repository-local sshCommand that git would otherwise run when talking to an
		// ssh remote, plus an ssh remote to trigger it.
		gitConfig(repoDir, 'core.sshCommand', `touch ${marker} #`);
		execFileSync('git', ['-C', repoDir, 'remote', 'add', 'origin', 'ssh://git@127.0.0.1:22/x.git']);

		const result = await gitNode.execute.call(buildContext('fetch', repoDir));

		expect(existsSync(marker)).toBe(false);
		// The fetch reached the network and failed; proves git actually ran, so the
		// assertion above is not vacuously green.
		expect((result[0][0].json as { error?: unknown }).error).toBeDefined();
	});

	it('still runs ssh for ssh remotes (pinning the default does not break it)', async () => {
		// With no repository-local sshCommand set, a plain ssh remote should still reach
		// ssh and fail with a connection error, not with git unable to launch ssh at all.
		execFileSync('git', ['-C', repoDir, 'remote', 'add', 'origin', 'ssh://git@127.0.0.1:22/x.git']);

		const result = await gitNode.execute.call(buildContext('fetch', repoDir));
		const error = (result[0][0].json as { error?: string }).error ?? '';

		expect(error.length).toBeGreaterThan(0);
		// The empty-value regression makes git try to run an empty command:
		// "cannot run : No such file or directory". Match that exact signature rather than
		// a bare "cannot run", which would also fire if ssh itself were missing from PATH.
		expect(error).not.toMatch(/cannot run :/);
	});
});
