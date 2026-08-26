import { DeploymentConfig, SecurityConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { IExecuteFunctions, NodeParameterValueType, ResolvedFilePath } from 'n8n-workflow';
import { execFileSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

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
	let additionalDirs: string[];

	const buildContext = (
		operation: string,
		repositoryPath: string,
		parameters: Record<string, NodeParameterValueType | object> = {},
	): Mocked<IExecuteFunctions> => {
		const ctx = mock<IExecuteFunctions>({
			getInputData: vi.fn(() => [{ json: {} }]),
			// Swallow the expected network failure so we can assert on the side effect.
			continueOnFail: vi.fn(() => true),
			getNodeParameter: vi.fn(),
			helpers: {
				returnJsonArray: vi.fn((data: any[]) => data.map((item: any) => ({ json: item }))),
				resolvePath: vi.fn(async (path: string) => path as ResolvedFilePath),
				isFilePathBlocked: vi.fn(() => false),
			},
		});
		ctx.getNodeParameter.mockImplementation(
			(
				name: string,
				_itemIndex: number,
				fallbackValue?: NodeParameterValueType,
			): NodeParameterValueType | object => {
				switch (name) {
					case 'operation':
						return operation;
					case 'repositoryPath':
						return repositoryPath;
					case 'options':
						return parameters.options ?? {};
					default:
						if (Object.hasOwn(parameters, name)) {
							return parameters[name];
						}
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
		additionalDirs = [];
		execFileSync('git', ['init', '-q', '-b', 'main', repoDir]);
		gitConfig(repoDir, 'user.email', 'test@example.com');
		gitConfig(repoDir, 'user.name', 'Test');
	});

	afterEach(async () => {
		await Promise.all(
			[repoDir, ...additionalDirs].map(
				async (dir) => await rm(dir, { recursive: true, force: true }),
			),
		);
	});

	const git = (...args: string[]) => execFileSync('git', ['-C', repoDir, ...args]);

	const markerCommand = () =>
		`node -e "require('node:fs').writeFileSync(process.argv[1], '')" ${JSON.stringify(marker)}`;

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

	it('does not run command-bearing repo-local git config on status', async () => {
		// A second, network-free key proves the mechanism generalizes beyond sshCommand.
		execFileSync('git', ['-C', repoDir, 'commit', '-q', '--allow-empty', '-m', 'init']);
		// A worktree file makes `git status` scan the working tree, which is what queries
		// the fsmonitor program (git may skip it on a trivial, unchanged index).
		writeFileSync(join(repoDir, 'tracked'), 'x');
		gitConfig(repoDir, 'core.fsmonitor', `touch ${marker}`);

		const result = await gitNode.execute.call(buildContext('status', repoDir));

		expect(existsSync(marker)).toBe(false);
		// status succeeded (no error), proving git ran and would have queried fsmonitor.
		expect((result[0][0].json as { error?: unknown }).error).toBeUndefined();
	});

	it('rejects a repo-local clean filter before add', async () => {
		writeFileSync(join(repoDir, '.gitattributes'), '*.txt filter=poc\n');
		writeFileSync(join(repoDir, 'payload.txt'), 'content');
		gitConfig(repoDir, 'filter.poc.clean', `${markerCommand()}; cat`);

		const result = await gitNode.execute.call(
			buildContext('add', repoDir, { pathsToAdd: 'payload.txt' }),
		);

		expect(existsSync(marker)).toBe(false);
		expect((result[0][0].json as { error?: unknown }).error).toBeDefined();
	});

	it('rejects a clean filter included from repository config', async () => {
		const includedConfig = join(repoDir, 'included-config');
		writeFileSync(join(repoDir, '.gitattributes'), '*.txt filter=poc\n');
		writeFileSync(join(repoDir, 'payload.txt'), 'content');
		execFileSync('git', [
			'config',
			'--file',
			includedConfig,
			'filter.poc.clean',
			`${markerCommand()}; cat`,
		]);
		gitConfig(repoDir, 'include.path', includedConfig);

		const result = await gitNode.execute.call(
			buildContext('add', repoDir, { pathsToAdd: 'payload.txt' }),
		);

		expect(existsSync(marker)).toBe(false);
		expect((result[0][0].json as { error?: unknown }).error).toBeDefined();
	});

	it('rejects a repo-local smudge filter before switching branch', async () => {
		writeFileSync(join(repoDir, '.gitattributes'), '*.txt filter=poc\n');
		writeFileSync(join(repoDir, 'payload.txt'), 'main');
		git('add', '.');
		git('commit', '-q', '-m', 'main');
		git('checkout', '-q', '-b', 'other');
		writeFileSync(join(repoDir, 'payload.txt'), 'other');
		git('commit', '-q', '-am', 'other');
		git('checkout', '-q', 'main');
		gitConfig(repoDir, 'filter.poc.smudge', `${markerCommand()}; cat`);

		const result = await gitNode.execute.call(
			buildContext('switchBranch', repoDir, {
				branchName: 'other',
				options: { createBranch: false },
			}),
		);

		expect(existsSync(marker)).toBe(false);
		expect((result[0][0].json as { error?: unknown }).error).toBeDefined();
	});

	it('rejects a repo-local process filter before add', async () => {
		writeFileSync(join(repoDir, '.gitattributes'), '*.txt filter=poc\n');
		writeFileSync(join(repoDir, 'payload.txt'), 'content');
		gitConfig(repoDir, 'filter.poc.process', markerCommand());

		const result = await gitNode.execute.call(
			buildContext('add', repoDir, { pathsToAdd: 'payload.txt' }),
		);

		expect(existsSync(marker)).toBe(false);
		expect((result[0][0].json as { error?: unknown }).error).toBeDefined();
	});

	it('rejects a repo-local merge driver before pull', async () => {
		writeFileSync(join(repoDir, '.gitattributes'), '*.txt merge=poc\n');
		writeFileSync(join(repoDir, 'payload.txt'), 'base');
		git('add', '.');
		git('commit', '-q', '-m', 'base');

		const remoteDir = await mkdtemp(join(tmpdir(), 'n8n-git-remote-'));
		const otherDir = await mkdtemp(join(tmpdir(), 'n8n-git-other-'));
		additionalDirs.push(remoteDir, otherDir);
		execFileSync('git', ['init', '--bare', '-q', '-b', 'main', remoteDir]);
		git('remote', 'add', 'origin', remoteDir);
		git('push', '-q', '-u', 'origin', 'main');

		execFileSync('git', ['clone', '-q', remoteDir, otherDir]);
		gitConfig(otherDir, 'user.email', 'test@example.com');
		gitConfig(otherDir, 'user.name', 'Test');
		writeFileSync(join(otherDir, 'payload.txt'), 'remote');
		execFileSync('git', ['-C', otherDir, 'commit', '-q', '-am', 'remote']);
		execFileSync('git', ['-C', otherDir, 'push', '-q']);

		writeFileSync(join(repoDir, 'payload.txt'), 'local');
		git('commit', '-q', '-am', 'local');
		gitConfig(repoDir, 'pull.rebase', 'false');
		gitConfig(repoDir, 'merge.poc.driver', `${markerCommand()}; exit 1`);

		const result = await gitNode.execute.call(buildContext('pull', repoDir));

		expect(existsSync(marker)).toBe(false);
		expect((result[0][0].json as { error?: unknown }).error).toBeDefined();
	});
});
