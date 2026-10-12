import { DeploymentConfig, SecurityConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	NodeParameterValueType,
	ResolvedFilePath,
} from 'n8n-workflow';
import { execFileSync } from 'node:child_process';
import type { PathLike } from 'node:fs';
import {
	cpSync,
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	symlinkSync,
	writeFileSync,
} from 'node:fs';
import { mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, sep } from 'node:path';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { Git } from '../Git.node';

// Unlike Git.node.test.ts, this suite intentionally does NOT mock simple-git or the
// filesystem: it runs real git against a throwaway repository so it exercises how the
// node actually handles repository-local git config end to end.

// Fixtures run git with the host's global and system config out of the way, so hooks,
// trace2 listeners and commit signing configured on a developer machine cannot reach them.
const runGit = (args: string[]) =>
	execFileSync('git', args, {
		env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null' },
	});

const gitConfig = (repo: string, key: string, value: string) =>
	runGit(['-C', repo, 'config', key, value]);

// git can still be writing into `.git` when a test ends, which makes a single-pass
// recursive remove fail with ENOTEMPTY.
const removeFixture = async (dir: string) =>
	await rm(dir, { recursive: true, force: true, maxRetries: 5 });

const configValue = (repo: string, key: string): string | undefined => {
	try {
		return runGit(['-C', repo, 'config', '--get', key]).toString().trim();
	} catch {
		return undefined;
	}
};

const branchesOf = (repo: string) => runGit(['-C', repo, 'for-each-ref', 'refs/heads']).toString();

const commitSubject = (repo: string, ref: string) =>
	runGit(['-C', repo, 'log', '--format=%s', '-1', ref]).toString().trim();

const errorOf = (result: INodeExecutionData[][]) => (result[0][0].json as { error?: string }).error;

// Mirrors the production helper in packages/core so relative references resolve through
// symlinks the way they do at runtime.
const resolveRealPath = async (path: string): Promise<ResolvedFilePath> => {
	try {
		return (await realpath(path)) as ResolvedFilePath;
	} catch (error) {
		if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) {
			throw error;
		}
		return join(await realpath(dirname(path)), basename(path)) as ResolvedFilePath;
	}
};

const blockedFilePattern = new RegExp(new SecurityConfig().blockFilePatterns);

/**
 * Context for the reference-validation suite. `allowedRoot` stands in for
 * `N8N_RESTRICT_FILE_ACCESS_TO`, and the block predicate also applies the default `.git`
 * pattern, which is what makes the git-directory checks load bearing. Omit `allowedRoot` to
 * block nothing. The config-handling suite has its own, simpler `buildContext`.
 */
const buildAllowedRootContext = (
	operation: string,
	repositoryPath: string,
	parameters: Record<string, NodeParameterValueType | object> = {},
	allowedRoot?: string,
): Mocked<IExecuteFunctions> => {
	const ctx = mock<IExecuteFunctions>({
		getInputData: vi.fn(() => [{ json: {} }]),
		// Swallow the expected failure so we can assert on the side effect.
		continueOnFail: vi.fn(() => true),
		getNodeParameter: vi.fn(),
		helpers: {
			returnJsonArray: vi.fn((data: any[]) => data.map((item: any) => ({ json: item }))),
			resolvePath: vi.fn(resolveRealPath),
			// The configured `N8N_BLOCK_FILE_PATTERNS`, which by default rejects every path with
			// a `.git` component, on top of the opt-in allowed root.
			isFilePathBlocked: vi.fn(
				(path: string) =>
					blockedFilePattern.test(path) ||
					(allowedRoot === undefined
						? false
						: !(path === allowedRoot || path.startsWith(allowedRoot + sep))),
			),
			resolveStagingBaseForTarget: vi.fn(async () => allowedRoot as ResolvedFilePath),
			pinDirectory: vi.fn(async () => null),
			assertNoSymlinkInPath: vi.fn(async () => {}),
			ensureParentDirectoryWithoutFollowingSymlinks: vi.fn(async () => {}),
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

const initRepository = (dir: string) => {
	runGit(['init', '-q', '-b', 'main', dir]);
	gitConfig(dir, 'user.email', 'test@example.com');
	gitConfig(dir, 'user.name', 'Test');
};

describe('Git Node command-config handling', () => {
	let gitNode: Git;
	let repoDir: string;
	let marker: string;
	let additionalDirs: string[];

	const buildContext = (
		operation: string,
		repositoryPath: string,
		parameters: Record<string, NodeParameterValueType | object> = {},
		isFilePathBlocked: (path: string) => boolean = () => false,
	): Mocked<IExecuteFunctions> => {
		const ctx = mock<IExecuteFunctions>({
			getInputData: vi.fn(() => [{ json: {} }]),
			// Swallow the expected network failure so we can assert on the side effect.
			continueOnFail: vi.fn(() => true),
			getNodeParameter: vi.fn(),
			helpers: {
				returnJsonArray: vi.fn((data: any[]) => data.map((item: any) => ({ json: item }))),
				resolvePath: vi.fn(async (path: string) => (await realpath(path)) as ResolvedFilePath),
				isFilePathBlocked: vi.fn(isFilePathBlocked),
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
		// git reports realpath'd directories, so the fixture root has to be one too.
		repoDir = await realpath(await mkdtemp(join(tmpdir(), 'n8n-git-cfg-')));
		marker = join(repoDir, 'command-ran');
		additionalDirs = [];
		initRepository(repoDir);
	});

	afterEach(async () => {
		await Promise.all([repoDir, ...additionalDirs].map(removeFixture));
	});

	const git = (...args: string[]) => runGit(['-C', repoDir, ...args]);

	const markerCommand = () =>
		`node -e "require('node:fs').writeFileSync(process.argv[1], '')" ${JSON.stringify(marker)}`;

	it('does not run command-bearing repo-local git config on fetch', async () => {
		// A repository-local sshCommand that git would otherwise run when talking to an
		// ssh remote, plus an ssh remote to trigger it.
		gitConfig(repoDir, 'core.sshCommand', `touch ${marker} #`);
		runGit(['-C', repoDir, 'remote', 'add', 'origin', 'ssh://git@127.0.0.1:22/x.git']);

		const result = await gitNode.execute.call(buildContext('fetch', repoDir));

		expect(existsSync(marker)).toBe(false);
		// The fetch reached the network and failed; proves git actually ran, so the
		// assertion above is not vacuously green.
		expect((result[0][0].json as { error?: unknown }).error).toBeDefined();
	});

	it('still runs ssh for ssh remotes (pinning the default does not break it)', async () => {
		// With no repository-local sshCommand set, a plain ssh remote should still reach
		// ssh and fail with a connection error, not with git unable to launch ssh at all.
		runGit(['-C', repoDir, 'remote', 'add', 'origin', 'ssh://git@127.0.0.1:22/x.git']);

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
		runGit(['-C', repoDir, 'commit', '-q', '--allow-empty', '-m', 'init']);
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
		runGit(['config', '--file', includedConfig, 'filter.poc.clean', `${markerCommand()}; cat`]);
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

	it('rejects a filesystem path where a remote name is expected', async () => {
		const outsideDir = await realpath(await mkdtemp(join(tmpdir(), 'n8n-git-outside-')));
		additionalDirs.push(outsideDir);
		git('commit', '-q', '--allow-empty', '-m', 'init');

		const result = await gitNode.execute.call(
			buildContext('switchBranch', repoDir, {
				branchName: 'main',
				options: { createBranch: false, setUpstream: true, remoteName: outsideDir },
			}),
		);

		expect((result[0][0].json as { error?: string }).error).toMatch(/Invalid remote name/);
		expect(readFileSync(join(repoDir, '.git', 'config'), 'utf8')).not.toContain(outsideDir);
	});

	it('rejects a branch remote outside the allowed paths before fetching', async () => {
		const outsideDir = await realpath(await mkdtemp(join(tmpdir(), 'n8n-git-outside-')));
		additionalDirs.push(outsideDir);
		execFileSync('git', ['init', '-q', '-b', 'main', outsideDir]);
		gitConfig(outsideDir, 'user.email', 'test@example.com');
		gitConfig(outsideDir, 'user.name', 'Test');
		execFileSync('git', ['-C', outsideDir, 'commit', '-q', '--allow-empty', '-m', 'outside']);

		git('commit', '-q', '--allow-empty', '-m', 'init');
		gitConfig(repoDir, 'branch.main.remote', outsideDir);

		const result = await gitNode.execute.call(
			buildContext('fetch', repoDir, {}, (path) => !path.startsWith(repoDir)),
		);

		expect((result[0][0].json as { error?: string }).error).toMatch(
			/source repository path is not allowed/,
		);
		expect(existsSync(join(repoDir, '.git', 'FETCH_HEAD'))).toBe(false);
	});

	it('still fetches from a branch remote inside the allowed paths', async () => {
		const innerDir = join(repoDir, 'inner-remote');
		execFileSync('git', ['init', '-q', '-b', 'main', innerDir]);
		gitConfig(innerDir, 'user.email', 'test@example.com');
		gitConfig(innerDir, 'user.name', 'Test');
		execFileSync('git', ['-C', innerDir, 'commit', '-q', '--allow-empty', '-m', 'inner']);

		git('commit', '-q', '--allow-empty', '-m', 'init');
		gitConfig(repoDir, 'branch.main.remote', innerDir);

		const result = await gitNode.execute.call(
			buildContext('fetch', repoDir, {}, (path) => !path.startsWith(repoDir)),
		);

		expect((result[0][0].json as { error?: unknown }).error).toBeUndefined();
		expect(existsSync(join(repoDir, '.git', 'FETCH_HEAD'))).toBe(true);
	});

	it('still fetches from a remote whose name has a path separator', async () => {
		const innerDir = join(repoDir, 'inner-remote');
		execFileSync('git', ['init', '-q', '-b', 'main', innerDir]);
		gitConfig(innerDir, 'user.email', 'test@example.com');
		gitConfig(innerDir, 'user.name', 'Test');
		execFileSync('git', ['-C', innerDir, 'commit', '-q', '--allow-empty', '-m', 'inner']);

		git('commit', '-q', '--allow-empty', '-m', 'init');
		gitConfig(repoDir, 'remote.gh/upstream.url', innerDir);
		gitConfig(repoDir, 'branch.main.remote', 'gh/upstream');

		const result = await gitNode.execute.call(
			buildContext('fetch', repoDir, {}, (path) => !path.startsWith(repoDir)),
		);

		expect((result[0][0].json as { error?: unknown }).error).toBeUndefined();
		expect(existsSync(join(repoDir, '.git', 'FETCH_HEAD'))).toBe(true);
	});

	it('rejects a repo-local merge driver before pull', async () => {
		writeFileSync(join(repoDir, '.gitattributes'), '*.txt merge=poc\n');
		writeFileSync(join(repoDir, 'payload.txt'), 'base');
		git('add', '.');
		git('commit', '-q', '-m', 'base');

		const remoteDir = await realpath(await mkdtemp(join(tmpdir(), 'n8n-git-remote-')));
		const otherDir = await realpath(await mkdtemp(join(tmpdir(), 'n8n-git-other-')));
		additionalDirs.push(remoteDir, otherDir);
		runGit(['init', '--bare', '-q', '-b', 'main', remoteDir]);
		git('remote', 'add', 'origin', remoteDir);
		git('push', '-q', '-u', 'origin', 'main');

		runGit(['clone', '-q', remoteDir, otherDir]);
		gitConfig(otherDir, 'user.email', 'test@example.com');
		gitConfig(otherDir, 'user.name', 'Test');
		writeFileSync(join(otherDir, 'payload.txt'), 'remote');
		runGit(['-C', otherDir, 'commit', '-q', '-am', 'remote']);
		runGit(['-C', otherDir, 'push', '-q']);

		writeFileSync(join(repoDir, 'payload.txt'), 'local');
		git('commit', '-q', '-am', 'local');
		gitConfig(repoDir, 'pull.rebase', 'false');
		gitConfig(repoDir, 'merge.poc.driver', `${markerCommand()}; exit 1`);

		const result = await gitNode.execute.call(buildContext('pull', repoDir));

		expect(existsSync(marker)).toBe(false);
		expect((result[0][0].json as { error?: unknown }).error).toBeDefined();
	});
});

const SOURCE_DENIED = 'Access to the source repository path is not allowed';
const TARGET_DENIED = 'Access to the target repository path is not allowed';
const REPOSITORY_OUT_OF_BOUNDS =
	'The git repository containing this path is outside the allowed file paths';

describe('Git Node repository reference validation', () => {
	let gitNode: Git;
	let tmpRoot: string;
	let allowedRoot: string;
	let outsideDir: string;
	let repoDir: string;
	let subDir: string;

	// `../../outside/target` lands inside the allowed root when resolved from `subDir` and
	// outside it when resolved from the repository top level, so it tells the two bases apart.
	const OUTSIDE_RELATIVE_REFERENCE = `..${sep}..${sep}outside${sep}target`;
	const OUTSIDE_FILE = 'outside-file';
	const OUTER_COMMIT_SUBJECT = 'outer-commit-marker';

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
		tmpRoot = await realpath(await mkdtemp(join(tmpdir(), 'n8n-git-ref-')));
		allowedRoot = join(tmpRoot, 'sandbox');
		outsideDir = join(tmpRoot, 'outside');
		repoDir = join(allowedRoot, 'repo');
		subDir = join(repoDir, 'sub');
		mkdirSync(outsideDir);
		mkdirSync(join(allowedRoot, 'outside'), { recursive: true });
		mkdirSync(join(allowedRoot, 'shared-mirror'));
		mkdirSync(subDir, { recursive: true });
		initRepository(repoDir);
		runGit(['-C', repoDir, 'commit', '-q', '--allow-empty', '-m', 'init']);
	});

	afterEach(async () => {
		await removeFixture(tmpRoot);
	});

	/** A bare repository outside the allowed root, sharing history with `repoDir`. */
	const createOutsideTarget = () => {
		const target = join(outsideDir, 'target');
		runGit(['clone', '-q', '--bare', '--no-hardlinks', repoDir, target]);
		return target;
	};

	/** A bare repository at `target` whose single commit carries `subject`. */
	const makeBareClone = (subject: string, target: string) => {
		const source = join(tmpRoot, `${subject}-src`);
		initRepository(source);
		runGit(['-C', source, 'commit', '-q', '--allow-empty', '-m', subject]);
		runGit(['clone', '-q', '--bare', source, target]);
	};

	/** Gives `target` a commit `repoDir` lacks, so a completed pull is observable. */
	const advanceOutsideTarget = (target: string) => {
		writeFileSync(join(repoDir, OUTSIDE_FILE), 'outside');
		runGit(['-C', repoDir, 'add', '.']);
		runGit(['-C', repoDir, 'commit', '-q', '-m', 'outside']);
		runGit(['-C', repoDir, 'push', '-q', target, 'main']);
		runGit(['-C', repoDir, 'reset', '-q', '--hard', 'HEAD~1']);
	};

	const trackRemote = (url: string) => {
		gitConfig(repoDir, 'remote.origin.url', url);
		gitConfig(repoDir, 'remote.origin.fetch', '+refs/heads/*:refs/remotes/origin/*');
		gitConfig(repoDir, 'branch.main.remote', 'origin');
		gitConfig(repoDir, 'branch.main.merge', 'refs/heads/main');
	};

	// Push runs with the file transport disabled unless hooks are enabled, so a local push
	// target is only reachable in that configuration.
	const allowLocalPushTransport = () => {
		Container.set(
			SecurityConfig,
			mock<SecurityConfig>({
				disableBareRepos: true,
				enableGitNodeHooks: true,
				enableGitNodeAllConfigKeys: false,
			}),
		);
	};

	// The suite default pins `safe.bareRepository=explicit`, which makes git refuse a bare
	// repository it discovered rather than exercise the layout logic.
	const allowBareRepositories = () => {
		Container.set(
			SecurityConfig,
			mock<SecurityConfig>({
				disableBareRepos: false,
				enableGitNodeHooks: false,
				enableGitNodeAllConfigKeys: false,
			}),
		);
	};

	const initOuterRepository = () => {
		initRepository(tmpRoot);
		runGit(['-C', tmpRoot, 'commit', '-q', '--allow-empty', '-m', OUTER_COMMIT_SUBJECT]);
	};

	it('rejects a relative remote URL that resolves outside the allowed path', async () => {
		const result = await gitNode.execute.call(
			buildAllowedRootContext(
				'addConfig',
				subDir,
				{ key: 'remote.origin.url', value: OUTSIDE_RELATIVE_REFERENCE },
				allowedRoot,
			),
		);

		expect(errorOf(result)).toContain(SOURCE_DENIED);
		expect(configValue(repoDir, 'remote.origin.url')).toBeUndefined();
	});

	// Regression control: this value is already refused today, and must stay refused.
	it('rejects a relative remote URL given from the repository top level', async () => {
		const result = await gitNode.execute.call(
			buildAllowedRootContext(
				'addConfig',
				repoDir,
				{ key: 'remote.origin.url', value: OUTSIDE_RELATIVE_REFERENCE },
				allowedRoot,
			),
		);

		expect(errorOf(result)).toContain(SOURCE_DENIED);
		expect(configValue(repoDir, 'remote.origin.url')).toBeUndefined();
	});

	it('accepts a relative remote URL that stays inside the allowed path', async () => {
		const result = await gitNode.execute.call(
			buildAllowedRootContext(
				'addConfig',
				subDir,
				{ key: 'remote.origin.url', value: '../shared-mirror' },
				allowedRoot,
			),
		);

		expect(errorOf(result)).toBeUndefined();
		expect(configValue(repoDir, 'remote.origin.url')).toBe('../shared-mirror');
	});

	it('does not pull from a configured remote outside the allowed path', async () => {
		const target = createOutsideTarget();
		advanceOutsideTarget(target);
		trackRemote(OUTSIDE_RELATIVE_REFERENCE);
		const branchesBefore = branchesOf(repoDir);

		const result = await gitNode.execute.call(
			buildAllowedRootContext('pull', subDir, {}, allowedRoot),
		);

		expect(errorOf(result)).toContain(SOURCE_DENIED);
		expect(existsSync(join(repoDir, OUTSIDE_FILE))).toBe(false);
		expect(branchesOf(repoDir)).toBe(branchesBefore);
	});

	it('does not push to a relative target repository outside the allowed path', async () => {
		allowLocalPushTransport();
		const target = createOutsideTarget();
		runGit(['-C', repoDir, 'commit', '-q', '--allow-empty', '-m', 'ahead']);
		gitConfig(repoDir, 'push.default', 'current');
		const branchesBefore = branchesOf(target);

		const result = await gitNode.execute.call(
			buildAllowedRootContext(
				'push',
				subDir,
				{ options: { repository: true, targetRepository: OUTSIDE_RELATIVE_REFERENCE } },
				allowedRoot,
			),
		);

		expect(errorOf(result)).toContain(TARGET_DENIED);
		expect(branchesOf(target)).toBe(branchesBefore);
	});

	it('does not push to a configured push URL outside the allowed path', async () => {
		allowLocalPushTransport();
		const target = createOutsideTarget();
		runGit(['-C', repoDir, 'commit', '-q', '--allow-empty', '-m', 'ahead']);
		trackRemote('../shared-mirror');
		gitConfig(repoDir, 'remote.origin.pushurl', OUTSIDE_RELATIVE_REFERENCE);
		const branchesBefore = branchesOf(target);

		const result = await gitNode.execute.call(
			buildAllowedRootContext('push', subDir, {}, allowedRoot),
		);

		expect(errorOf(result)).toContain(TARGET_DENIED);
		expect(branchesOf(target)).toBe(branchesBefore);
	});

	it('rejects an operation when the enclosing repository is outside the allowed path', async () => {
		initOuterRepository();

		const result = await gitNode.execute.call(
			buildAllowedRootContext('log', allowedRoot, {}, allowedRoot),
		);

		expect(errorOf(result)).toContain(REPOSITORY_OUT_OF_BOUNDS);
		expect(JSON.stringify(result)).not.toContain(OUTER_COMMIT_SUBJECT);
	});

	it('does not list config from an enclosing repository outside the allowed path', async () => {
		const outerMarker = 'outer-marker@example.com';
		initOuterRepository();
		gitConfig(tmpRoot, 'user.email', outerMarker);

		const result = await gitNode.execute.call(
			buildAllowedRootContext('listConfig', allowedRoot, {}, allowedRoot),
		);

		expect(errorOf(result)).toContain(REPOSITORY_OUT_OF_BOUNDS);
		expect(JSON.stringify(result)).not.toContain(outerMarker);
	});

	it('follows symlinks when resolving a relative remote URL', async () => {
		mkdirSync(join(outsideDir, 'sub'));
		symlinkSync(join(outsideDir, 'sub'), join(repoDir, 'link'));

		const result = await gitNode.execute.call(
			buildAllowedRootContext(
				'addConfig',
				repoDir,
				{ key: 'remote.origin.url', value: 'link/../cand' },
				allowedRoot,
			),
		);

		expect(errorOf(result)).toContain(SOURCE_DENIED);
		expect(configValue(repoDir, 'remote.origin.url')).toBeUndefined();
	});

	// The name check itself lives in `validateGitRemoteName`; this pins that it runs before the
	// checkout, so a refused name cannot leave a created or switched-to branch behind.
	it('rejects an upstream remote name before creating the branch', async () => {
		const result = await gitNode.execute.call(
			buildAllowedRootContext(
				'switchBranch',
				repoDir,
				{
					branchName: 'feature',
					options: { setUpstream: true, remoteName: OUTSIDE_RELATIVE_REFERENCE },
				},
				allowedRoot,
			),
		);

		expect(errorOf(result)).toMatch(/Invalid remote name/);
		expect(configValue(repoDir, 'branch.feature.remote')).toBeUndefined();
		expect(configValue(repoDir, 'branch.feature.merge')).toBeUndefined();
		// The rejection has to stop the switch itself, not just the upstream write.
		expect(branchesOf(repoDir)).not.toContain('feature');
		expect(runGit(['-C', repoDir, 'branch', '--show-current']).toString().trim()).toBe('main');
	});

	it('accepts a plain upstream remote name', async () => {
		const result = await gitNode.execute.call(
			buildAllowedRootContext(
				'switchBranch',
				repoDir,
				{ branchName: 'feature', options: { setUpstream: true, remoteName: 'origin' } },
				allowedRoot,
			),
		);

		expect(errorOf(result)).toBeUndefined();
		expect(configValue(repoDir, 'branch.feature.remote')).toBe('origin');
	});

	it('rejects a repository whose git directory is outside the allowed path', async () => {
		const redirectedSubject = 'redirected-commit-marker';
		const redirected = join(allowedRoot, 'redirected');
		runGit([
			'init',
			'-q',
			'-b',
			'main',
			`--separate-git-dir=${join(outsideDir, 'gd')}`,
			redirected,
		]);
		gitConfig(redirected, 'user.email', 'test@example.com');
		gitConfig(redirected, 'user.name', 'Test');
		runGit(['-C', redirected, 'commit', '-q', '--allow-empty', '-m', redirectedSubject]);
		const redirectedSub = join(redirected, 'sub');
		mkdirSync(redirectedSub);

		const result = await gitNode.execute.call(
			buildAllowedRootContext('log', redirectedSub, {}, allowedRoot),
		);

		expect(errorOf(result)).toContain(REPOSITORY_OUT_OF_BOUNDS);
		expect(JSON.stringify(result)).not.toContain(redirectedSubject);
	});

	it('rejects a linked worktree whose git directory is outside the allowed path', async () => {
		const worktree = join(allowedRoot, 'wt');
		const relocated = join(outsideDir, 'wtgd');
		runGit(['-C', repoDir, 'worktree', 'add', '-q', '-b', 'wtb', worktree]);
		cpSync(join(repoDir, '.git', 'worktrees', 'wt'), relocated, { recursive: true });
		writeFileSync(join(worktree, '.git'), `gitdir: ${relocated}\n`);
		writeFileSync(join(relocated, 'commondir'), `${join(repoDir, '.git')}\n`);
		const ctx = buildAllowedRootContext('status', worktree, {}, allowedRoot);
		ctx.continueOnFail = vi.fn(() => false);

		await expect(gitNode.execute.call(ctx)).rejects.toMatchObject({
			message: expect.stringContaining(REPOSITORY_OUT_OF_BOUNDS),
			// Widening the allowed paths cannot fix this one, so it gets its own remediation.
			description: 'The git directory of this worktree is not inside the repository it belongs to',
		});
	});

	// Control: `<allowedRoot>/bare` is both the git directory and git's cwd, so this value is
	// refused whichever of the two the base is taken from.
	it('keeps rejecting an out-of-bounds reference in a bare repository', async () => {
		allowBareRepositories();
		const bare = join(allowedRoot, 'bare');
		runGit(['init', '-q', '--bare', '-b', 'main', bare]);

		const result = await gitNode.execute.call(
			buildAllowedRootContext(
				'addConfig',
				bare,
				{ key: 'remote.origin.url', value: OUTSIDE_RELATIVE_REFERENCE },
				allowedRoot,
			),
		);

		expect(errorOf(result)).toContain(SOURCE_DENIED);
		expect(configValue(bare, 'remote.origin.url')).toBeUndefined();
	});

	it('resolves a relative remote URL from a subdirectory of a bare repository', async () => {
		allowBareRepositories();
		const bare = join(allowedRoot, 'bare');
		runGit(['init', '-q', '--bare', '-b', 'main', bare]);

		const result = await gitNode.execute.call(
			buildAllowedRootContext(
				'addConfig',
				join(bare, 'refs'),
				{ key: 'remote.origin.url', value: OUTSIDE_RELATIVE_REFERENCE },
				allowedRoot,
			),
		);

		// From `<bare>/refs` the value stays inside the allowed root, and that is where git
		// resolves it from; taking the git directory as the base would refuse it.
		expect(errorOf(result)).toBeUndefined();
		expect(configValue(bare, 'remote.origin.url')).toBe(OUTSIDE_RELATIVE_REFERENCE);
	});

	it('rejects a relative remote URL when the repository configures a work tree elsewhere', async () => {
		// `--show-toplevel` then reports the configured work tree, but git keeps resolving
		// relative references from the directory it was started in.
		const workTree = join(allowedRoot, 'deep', 'wt');
		mkdirSync(workTree, { recursive: true });
		gitConfig(repoDir, 'core.worktree', workTree);

		const result = await gitNode.execute.call(
			buildAllowedRootContext(
				'addConfig',
				repoDir,
				{ key: 'remote.origin.url', value: OUTSIDE_RELATIVE_REFERENCE },
				allowedRoot,
			),
		);

		expect(errorOf(result)).toContain(SOURCE_DENIED);
		expect(configValue(repoDir, 'remote.origin.url')).toBeUndefined();
	});

	it('rejects an operation whose work tree is outside the allowed path', async () => {
		// The work tree is where the operation reads and writes files, so it has to be checked
		// even though git resolves relative references from the directory it was started in.
		const outsideWorkTree = join(tmpRoot, 'outside', 'worktree');
		mkdirSync(outsideWorkTree, { recursive: true });
		writeFileSync(join(outsideWorkTree, 'secret.txt'), 'out-of-bounds\n');
		gitConfig(repoDir, 'core.worktree', outsideWorkTree);

		const result = await gitNode.execute.call(
			buildAllowedRootContext('status', repoDir, {}, allowedRoot),
		);

		expect(errorOf(result)).toContain(REPOSITORY_OUT_OF_BOUNDS);
		expect(JSON.stringify(result)).not.toContain('secret.txt');
	});

	it('rejects a relative remote URL when the work tree is the filesystem root', async () => {
		// Every directory is inside the root, so git chdirs there and resolves relative
		// references from it. `../shared-mirror` only stays inside the allowed path when it is
		// resolved from the directory git was started in.
		gitConfig(repoDir, 'core.worktree', sep);

		const result = await gitNode.execute.call(
			buildAllowedRootContext(
				'addConfig',
				repoDir,
				{ key: 'remote.origin.url', value: '../shared-mirror' },
				allowedRoot,
			),
		);

		expect(errorOf(result)).toContain(REPOSITORY_OUT_OF_BOUNDS);
		expect(configValue(repoDir, 'remote.origin.url')).toBeUndefined();
	});

	it('resolves a relative remote URL from a run directory that only shares a name prefix with the work tree', async () => {
		// `<allowedRoot>/rep` is not an ancestor of `<allowedRoot>/rep-x/sub`, so git resolves
		// from the directory it was started in; from the work tree the value would land outside.
		const workTree = join(allowedRoot, 'rep');
		const nearby = join(allowedRoot, 'rep-x');
		const nearbySubDir = join(nearby, 'sub');
		mkdirSync(workTree);
		mkdirSync(nearbySubDir, { recursive: true });
		initRepository(nearby);
		gitConfig(nearby, 'core.worktree', workTree);

		const result = await gitNode.execute.call(
			buildAllowedRootContext(
				'addConfig',
				nearbySubDir,
				{ key: 'remote.origin.url', value: '../../shared-mirror' },
				allowedRoot,
			),
		);

		expect(errorOf(result)).toBeUndefined();
		expect(configValue(nearby, 'remote.origin.url')).toBe('../../shared-mirror');
	});

	it('rejects a relative remote URL when the git directory sits below the repository path', async () => {
		// A `.git` file pointing at a nested bare store leaves git without a work tree; the
		// base is still the directory git was started in, not the store.
		const holder = join(allowedRoot, 'holder');
		const store = join(holder, 'store');
		mkdirSync(holder);
		runGit(['init', '-q', '--bare', '-b', 'main', store]);
		writeFileSync(join(holder, '.git'), `gitdir: ${store}\n`);

		const result = await gitNode.execute.call(
			buildAllowedRootContext(
				'addConfig',
				holder,
				{ key: 'remote.origin.url', value: OUTSIDE_RELATIVE_REFERENCE },
				allowedRoot,
			),
		);

		expect(errorOf(result)).toContain(SOURCE_DENIED);
		expect(configValue(holder, 'remote.origin.url')).toBeUndefined();
	});

	it('allows a linked worktree inside the allowed path', async () => {
		const worktree = join(allowedRoot, 'wt');
		runGit(['-C', repoDir, 'worktree', 'add', '-q', '-b', 'wtb', worktree]);

		const result = await gitNode.execute.call(
			buildAllowedRootContext('status', worktree, {}, allowedRoot),
		);

		expect(errorOf(result)).toBeUndefined();
		// `repoDir` is on `main`, so this pins the status to the worktree it ran in.
		expect(result[0][0].json.current).toBe('wtb');
	});

	it('allows a submodule work tree inside the allowed path', async () => {
		const source = join(allowedRoot, 'submodule-src');
		initRepository(source);
		runGit(['-C', source, 'commit', '-q', '--allow-empty', '-m', 'src']);
		runGit([
			'-c',
			'protocol.file.allow=always',
			'-C',
			repoDir,
			'submodule',
			'add',
			'-q',
			source,
			'sub-mod',
		]);
		// Only the submodule's own status lists this file as untracked.
		writeFileSync(join(repoDir, 'sub-mod', 'untracked-in-submodule'), 'x');

		const result = await gitNode.execute.call(
			buildAllowedRootContext('status', join(repoDir, 'sub-mod'), {}, allowedRoot),
		);

		expect(errorOf(result)).toBeUndefined();
		expect(result[0][0].json.not_added).toEqual(['untracked-in-submodule']);
	});

	it('rejects a clone source the staging base puts outside the allowed path', async () => {
		// `../outside/src` lands on the decoy when resolved from the target's parent and on the
		// real repository outside the allowed root when resolved from the staging base.
		mkdirSync(join(allowedRoot, 'deep', 'outside'), { recursive: true });
		mkdirSync(join(allowedRoot, 'deep', 'nested'), { recursive: true });
		const source = join(outsideDir, 'src');
		const target = join(allowedRoot, 'deep', 'nested', 'new-repo');
		initRepository(source);
		runGit(['-C', source, 'commit', '-q', '--allow-empty', '-m', 'src']);

		const result = await gitNode.execute.call(
			buildAllowedRootContext('clone', target, { sourceRepository: '../outside/src' }, allowedRoot),
		);

		expect(errorOf(result)).toContain(SOURCE_DENIED);
		// The rejection has to land before the staging directory is created.
		expect(readdirSync(allowedRoot).filter((entry) => entry.startsWith('.n8n-clone-'))).toEqual([]);
		expect(existsSync(target)).toBe(false);
	});

	it('accepts a reference whose parent directories do not exist yet', async () => {
		const result = await gitNode.execute.call(
			buildAllowedRootContext(
				'addConfig',
				subDir,
				{ key: 'remote.origin.url', value: '../not-yet-created/mirror' },
				allowedRoot,
			),
		);

		expect(errorOf(result)).toBeUndefined();
		expect(configValue(repoDir, 'remote.origin.url')).toBe('../not-yet-created/mirror');
	});

	it('accepts a reference that walks back out of a missing directory', async () => {
		const result = await gitNode.execute.call(
			buildAllowedRootContext(
				'addConfig',
				repoDir,
				{ key: 'remote.origin.url', value: 'nosuch/../shared-mirror' },
				allowedRoot,
			),
		);

		expect(errorOf(result)).toBeUndefined();
		expect(configValue(repoDir, 'remote.origin.url')).toBe('nosuch/../shared-mirror');
	});

	it('fetches a relative remote from the repository top level', async () => {
		// The premise the validation rests on: git resolves the value from the top level it
		// walked up to, not from the directory the node was pointed at.
		makeBareClone('from-top-level', join(outsideDir, 'target'));
		makeBareClone('from-sub-dir', join(allowedRoot, 'outside', 'target'));
		trackRemote(OUTSIDE_RELATIVE_REFERENCE);

		// No allowed root, so nothing is refused and the fetch actually runs.
		const result = await gitNode.execute.call(buildAllowedRootContext('fetch', subDir));

		expect(errorOf(result)).toBeUndefined();
		expect(commitSubject(repoDir, 'refs/remotes/origin/main')).toBe('from-top-level');
	});

	it('surfaces a friendly error when the repository top level cannot be resolved', async () => {
		const ctx = buildAllowedRootContext('log', subDir, {}, allowedRoot);
		ctx.continueOnFail = vi.fn(() => false);
		ctx.helpers.resolvePath = vi.fn(async (path: PathLike) => {
			if (path === repoDir) {
				throw new Error('EACCES: permission denied, realpath');
			}
			return await resolveRealPath(path.toString());
		});

		await expect(gitNode.execute.call(ctx)).rejects.toMatchObject({
			message: 'Could not determine the git repository for this path',
			description: expect.stringContaining('EACCES'),
		});
	});

	it('surfaces the git error for a path that is not in a repository', async () => {
		const plain = join(allowedRoot, 'plain');
		mkdirSync(plain);
		const ctx = buildAllowedRootContext('listConfig', plain, {}, allowedRoot);
		ctx.continueOnFail = vi.fn(() => false);

		await expect(gitNode.execute.call(ctx)).rejects.toMatchObject({
			message: 'Could not determine the git repository for this path',
			description: expect.stringContaining('fatal:'),
		});
	});
});
