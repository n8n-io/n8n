import { mock, mockDeep } from 'vitest-mock-extended';
import type { ConfigListSummary, SimpleGit } from 'simple-git';
import type { INode, ResolvedFilePath } from 'n8n-workflow';

import {
	getConfiguredRemoteRepositories,
	getGitRepositoryLayout,
	findBlacklistedKeys,
	getRepositoryTypeForRemoteConfigKey,
	isWithinPath,
	mapGitConfigList,
	ownerOfGitDir,
	validateGitRemoteName,
} from '../GenericFunctions';

const WORK_TREE_ARGS = ['rev-parse', '--show-toplevel', '--absolute-git-dir', '--git-common-dir'];
const GIT_DIR_ARGS = [
	'rev-parse',
	'--absolute-git-dir',
	'--git-common-dir',
	'--is-inside-work-tree',
];

/** Answers `rev-parse` per argument list; a missing entry rejects, as git does. */
const gitStub = (responses: Record<string, string>) =>
	mock<SimpleGit>({
		raw: (async (args: string[]) => {
			const output = responses[args.join(' ')];
			if (output === undefined) throw new Error('fatal: not a git repository');
			return output;
		}) as unknown as SimpleGit['raw'],
	});

describe('GenericFunctions', () => {
	describe('findBlacklistedKeys', () => {
		it('should reject filter and merge commands from repository config only', () => {
			const config = mockDeep<ConfigListSummary>({
				files: ['global-config', '.git/config', 'command line:'],
				values: {
					'global-config': { 'filter.lfs.process': 'git-lfs filter-process' },
					'.git/config': {
						'filter.poc.clean': 'command',
						'merge.poc.driver': 'command',
					},
					'command line:': { 'core.sshcommand': 'ssh' },
				},
			});

			const result = findBlacklistedKeys(config, ['.git/config']);

			expect(result).toEqual(['filter.poc.clean', 'merge.poc.driver']);
		});

		it('should reject other command-bearing repository config keys', () => {
			const blacklistedKeys = [
				'core.askPass',
				'core.editor',
				'core.alternateRefsCommand',
				'gc.recentObjectsHook',
				'hook.pre-commit.command',
				'sequence.editor',
				'remote.origin.uploadpack',
				'remote.origin.receivepack',
				'gpg.openpgp.program',
				'gpg.x509.program',
				'gpg.ssh.program',
				'gpg.ssh.defaultKeyCommand',
			];
			const config = mockDeep<ConfigListSummary>({
				files: ['.git/config'],
				values: {
					'.git/config': Object.fromEntries(blacklistedKeys.map((key) => [key, 'command'])),
				},
			});

			expect(findBlacklistedKeys(config, ['.git/config'])).toEqual(blacklistedKeys);
		});

		it('should include config files included from repository config', () => {
			const config = mockDeep<ConfigListSummary>({
				files: ['global-config', '.git/config', 'included-config', 'command line:'],
				values: {
					'global-config': {},
					'.git/config': { 'include.path': 'included-config' },
					'included-config': { 'FILTER.POC.PROCESS': 'command' },
					'command line:': {},
				},
			});

			const result = findBlacklistedKeys(config, ['.git/config']);

			expect(result).toEqual(['FILTER.POC.PROCESS']);
		});

		it('should return no keys when repository config origin is absent', () => {
			const config = mockDeep<ConfigListSummary>({
				files: ['global-config', 'command line:'],
				values: {
					'global-config': { 'filter.lfs.clean': 'git-lfs clean' },
					'command line:': {},
				},
			});

			expect(findBlacklistedKeys(config, ['.git/config'])).toEqual([]);
		});
	});

	describe('getRepositoryTypeForRemoteConfigKey', () => {
		it.each([
			['remote.origin.url', 'source'],
			['remote.origin.pushurl', 'target'],
			['branch.main.remote', 'source'],
			['branch.main.pushremote', 'target'],
			['remote.pushdefault', 'target'],
			['branch.main.merge', undefined],
			['user.email', undefined],
		])('should map %s to %s', (key, expected) => {
			expect(getRepositoryTypeForRemoteConfigKey(key)).toBe(expected);
		});
	});

	describe('validateGitRemoteName', () => {
		it.each(['origin', 'my-remote', 'remote_1', 'a.b', '_private', 'gh/upstream', 'ünïcode', '.'])(
			'should accept %s',
			(name) => {
				expect(() => validateGitRemoteName(name, mockDeep<INode>())).not.toThrow();
			},
		);

		it.each([
			'/outside/repo',
			'../outside',
			'-upload-pack=cmd',
			'.hidden',
			'host:path',
			'https://github.com/test/repo.git',
			'C:\\Windows',
			'',
			'a b',
			'//double/slash',
			'trailing/',
		])('should reject %s', (name) => {
			expect(() => validateGitRemoteName(name, mockDeep<INode>())).toThrow('Invalid remote name');
		});
	});

	describe('mapGitConfigList', () => {
		it('should map the git config list', () => {
			const config = mockDeep<ConfigListSummary>({
				values: {
					'.git/config': {
						'user.name': 'test',
						'core.autocrlf': 'true',
						'remote.origin.url': undefined,
						'remote.origin.pushurl': undefined,
					},
					'/other/config': {
						'user.name': 'other',
						'core.autocrlf': 'false',
						'remote.origin.url': undefined,
						'remote.origin.pushurl': undefined,
					},
				},
			});

			const result = mapGitConfigList(config);

			expect(result).toEqual([
				{
					_file: '.git/config',
					'user.name': 'test',
					'core.autocrlf': 'true',
				},
				{
					_file: '/other/config',
					'user.name': 'other',
					'core.autocrlf': 'false',
				},
			]);
		});

		it('should sanitize the remote origin url', () => {
			const config = mockDeep<ConfigListSummary>({
				values: {
					'.git/config': {
						'remote.origin.url': 'https://user:password@github.com/test/test.git',
						'remote.origin.pushurl': undefined,
					},
				},
			});

			const result = mapGitConfigList(config);

			expect(result).toEqual([
				{
					_file: '.git/config',
					'remote.origin.url': 'https://github.com/test/test.git',
				},
			]);
		});

		it('should sanitize the remote origin urls', () => {
			const config = mockDeep<ConfigListSummary>({
				values: {
					'.git/config': {
						'remote.origin.url': [
							'https://user:password@github.com/test/test.git',
							'https://user:password@github.com/test/other.git',
						],
						'remote.origin.pushurl': undefined,
					},
				},
			});

			const result = mapGitConfigList(config);

			expect(result).toEqual([
				{
					_file: '.git/config',
					'remote.origin.url': [
						'https://github.com/test/test.git',
						'https://github.com/test/other.git',
					],
				},
			]);
		});

		it('should sanitize the remote origin push url', () => {
			const config = mockDeep<ConfigListSummary>({
				values: {
					'.git/config': {
						'remote.origin.pushurl': 'https://user:password@github.com/test/test.git',
						'remote.origin.url': undefined,
					},
				},
			});

			const result = mapGitConfigList(config);

			expect(result).toEqual([
				{
					_file: '.git/config',
					'remote.origin.pushurl': 'https://github.com/test/test.git',
				},
			]);
		});

		it('should sanitize the remote origin push urls', () => {
			const config = mockDeep<ConfigListSummary>({
				values: {
					'.git/config': {
						'remote.origin.pushurl': [
							'https://user:password@github.com/test/test.git',
							'https://user:password@github.com/test/other.git',
						],
						'remote.origin.url': undefined,
					},
				},
			});

			const result = mapGitConfigList(config);

			expect(result).toEqual([
				{
					_file: '.git/config',
					'remote.origin.pushurl': [
						'https://github.com/test/test.git',
						'https://github.com/test/other.git',
					],
				},
			]);
		});
	});

	describe('getConfiguredRemoteRepositories', () => {
		it('should return every configured remote URL as a validation target', () => {
			const config = mockDeep<ConfigListSummary>({
				values: {
					'.git/config': {
						'remote.origin.url': 'https://github.com/test/repo.git',
						'remote.origin.pushurl': 'https://github.com/test/push-repo.git',
						'remote.upstream.url': '/outside/source-repo',
						'remote.upstream.pushurl': '/outside/target-repo',
						'branch.main.remote': 'upstream',
					},
				},
			});

			const result = getConfiguredRemoteRepositories(config.values, mockDeep<INode>());

			expect(result).toEqual({
				sourceValidationTargets: ['https://github.com/test/repo.git', '/outside/source-repo'],
				targetValidationTargets: ['https://github.com/test/push-repo.git', '/outside/target-repo'],
				pushTarget: 'https://github.com/test/push-repo.git',
			});
		});

		it('should return a branch remote that names no configured remote', () => {
			const config = mockDeep<ConfigListSummary>({
				values: {
					'.git/config': {
						'remote.origin.url': 'https://github.com/test/repo.git',
						'branch.main.remote': '/outside/repo',
					},
				},
			});

			const result = getConfiguredRemoteRepositories(config.values, mockDeep<INode>());

			expect(result.sourceValidationTargets).toEqual([
				'https://github.com/test/repo.git',
				'/outside/repo',
			]);
			expect(result.targetValidationTargets).toEqual([
				'https://github.com/test/repo.git',
				'/outside/repo',
			]);
		});

		it('should return push-only branch and default remotes as target validation targets', () => {
			const config = mockDeep<ConfigListSummary>({
				values: {
					'.git/config': {
						'branch.main.pushremote': '/outside/push-repo',
						'remote.pushdefault': '/outside/default-repo',
					},
				},
			});

			const result = getConfiguredRemoteRepositories(config.values, mockDeep<INode>());

			expect(result.sourceValidationTargets).toEqual([]);
			expect(result.targetValidationTargets).toEqual([
				'/outside/push-repo',
				'/outside/default-repo',
			]);
		});

		it('should return every value of a multi-valued branch remote', () => {
			const config = mockDeep<ConfigListSummary>({
				values: {
					'.git/config': {
						'branch.main.remote': ['/outside/first', '/outside/second'],
					},
				},
			});

			const result = getConfiguredRemoteRepositories(config.values, mockDeep<INode>());

			expect(result.sourceValidationTargets).toEqual(['/outside/first', '/outside/second']);
		});

		it('should treat a branch remote as unresolved when the configured remote differs in case', () => {
			const config = mockDeep<ConfigListSummary>({
				values: {
					'.git/config': {
						'remote.origin.url': 'https://github.com/test/repo.git',
						'branch.main.remote': 'Origin',
					},
				},
			});

			const result = getConfiguredRemoteRepositories(config.values, mockDeep<INode>());

			expect(result.sourceValidationTargets).toContain('Origin');
		});

		it('should not resolve a branch remote against a remote git refuses to register', () => {
			const config = mockDeep<ConfigListSummary>({
				values: {
					'.git/config': {
						'remote./outside/repo.url': 'https://github.com/test/repo.git',
						'branch.main.remote': '/outside/repo',
					},
				},
			});

			const result = getConfiguredRemoteRepositories(config.values, mockDeep<INode>());

			expect(result.sourceValidationTargets).toContain('/outside/repo');
		});

		it('should not resolve a branch remote against a push-URL-only remote', () => {
			const config = mockDeep<ConfigListSummary>({
				values: {
					'.git/config': {
						'remote.deploy.pushurl': '/outside/push-repo',
						'branch.main.remote': 'deploy',
					},
				},
			});

			const result = getConfiguredRemoteRepositories(config.values, mockDeep<INode>());

			expect(result.sourceValidationTargets).toContain('deploy');
		});

		it('should resolve a branch remote against a remote configured in another file', () => {
			const config = mockDeep<ConfigListSummary>({
				values: {
					'global-config': { 'remote.upstream.url': 'https://github.com/test/upstream.git' },
					'.git/config': { 'branch.main.remote': 'upstream' },
				},
			});

			const result = getConfiguredRemoteRepositories(config.values, mockDeep<INode>());

			expect(result.sourceValidationTargets).toEqual(['https://github.com/test/upstream.git']);
		});

		it('should keep using origin as the prepared push target', () => {
			const config = mockDeep<ConfigListSummary>({
				values: {
					'.git/config': {
						'remote.upstream.url': '/outside/source-repo',
						'remote.origin.url': 'https://github.com/test/repo.git',
					},
				},
			});

			const result = getConfiguredRemoteRepositories(config.values, mockDeep<INode>());

			expect(result.pushTarget).toBe('https://github.com/test/repo.git');
		});
	});

	describe('getGitRepositoryLayout', () => {
		it('reports the work tree top level', async () => {
			const git = gitStub({
				[WORK_TREE_ARGS.join(' ')]: '/repo\n/repo/.git\n../.git\n',
			});

			expect(await getGitRepositoryLayout(git)).toEqual({
				topLevel: '/repo',
				gitDir: '/repo/.git',
				commonDir: '../.git',
			});
		});

		it('reports no top level when there is no work tree', async () => {
			const git = gitStub({
				[GIT_DIR_ARGS.join(' ')]: '/repo/bare\n.\nfalse\n',
			});

			expect(await getGitRepositoryLayout(git)).toEqual({
				topLevel: undefined,
				gitDir: '/repo/bare',
				commonDir: '.',
			});
		});

		// POSIX allows a carriage return in a directory name, so stripping one would name a
		// different directory than the one git reported.
		it('keeps a trailing carriage return that is part of a path', async () => {
			const git = gitStub({
				[WORK_TREE_ARGS.join(' ')]: '/repo\r\n/repo\r/.git\r\n../.git\r\n',
			});

			expect(await getGitRepositoryLayout(git)).toEqual({
				topLevel: '/repo\r',
				gitDir: '/repo\r/.git\r',
				commonDir: '../.git\r',
			});
		});

		it('rejects output with an unexpected number of lines', async () => {
			const git = gitStub({
				[WORK_TREE_ARGS.join(' ')]: '/repo with a\nnewline\n/repo/.git\n../.git\n',
			});

			await expect(getGitRepositoryLayout(git)).rejects.toThrow(
				'Could not read the git repository layout',
			);
		});

		it('rejects output with an empty line', async () => {
			const git = gitStub({
				[WORK_TREE_ARGS.join(' ')]: '/repo\n\n../.git\n',
			});

			await expect(getGitRepositoryLayout(git)).rejects.toThrow(
				'Could not read the git repository layout',
			);
		});

		it('rejects a work-tree-less report with an unexpected number of lines', async () => {
			const git = gitStub({
				[GIT_DIR_ARGS.join(' ')]: '/repo/bare\n.\n',
			});

			await expect(getGitRepositoryLayout(git)).rejects.toThrow(
				'Could not read the git repository layout',
			);
		});

		it('rejects a work-tree-less report with an empty line', async () => {
			const git = gitStub({
				[GIT_DIR_ARGS.join(' ')]: '/repo/bare\n\nfalse\n',
			});

			await expect(getGitRepositoryLayout(git)).rejects.toThrow(
				'Could not read the git repository layout',
			);
		});

		it('keeps a trailing carriage return in a work-tree-less report', async () => {
			const git = gitStub({
				[GIT_DIR_ARGS.join(' ')]: '/repo/bare\r\n.\r\nfalse\n',
			});

			expect(await getGitRepositoryLayout(git)).toEqual({
				topLevel: undefined,
				gitDir: '/repo/bare\r',
				commonDir: '.\r',
			});
		});

		it('rejects a repository that git still reports as having a work tree', async () => {
			const git = gitStub({
				[GIT_DIR_ARGS.join(' ')]: '/repo/.git\n/repo/.git\ntrue\n',
			});

			await expect(getGitRepositoryLayout(git)).rejects.toThrow(
				'Could not read the git repository layout',
			);
		});

		it('keeps the original failure when git cannot report the layout at all', async () => {
			const git = gitStub({});

			await expect(getGitRepositoryLayout(git)).rejects.toThrow('fatal: not a git repository');
		});

		it('rejects a relative top level', async () => {
			const git = gitStub({
				[WORK_TREE_ARGS.join(' ')]: 'repo\n/repo/.git\n../.git\n',
			});

			await expect(getGitRepositoryLayout(git)).rejects.toThrow(
				'Could not read the git repository layout',
			);
		});

		it('rejects a relative git directory', async () => {
			const git = gitStub({
				[WORK_TREE_ARGS.join(' ')]: '/repo\nrepo/.git\n../.git\n',
			});

			await expect(getGitRepositoryLayout(git)).rejects.toThrow(
				'Could not read the git repository layout',
			);
		});

		it('rejects a work-tree-less report with a relative git directory', async () => {
			const git = gitStub({
				[GIT_DIR_ARGS.join(' ')]: 'bare\n.\nfalse\n',
			});

			await expect(getGitRepositoryLayout(git)).rejects.toThrow(
				'Could not read the git repository layout',
			);
		});
	});

	describe('isWithinPath', () => {
		it.each([
			['/a/b', '/a/b', true],
			['/a', '/a/b', true],
			['/a', '/a/b/c', true],
			['/a/rep', '/a/rep-x', false],
			['/a/rep-x', '/a/rep', false],
			['/', '/x', true],
			['/', '/', true],
			// A drive root, which like `/` already ends in a separator.
			['C:/', 'C:/x', true],
		])('%s contains %s: %s', (parent, candidate, expected) => {
			expect(isWithinPath(parent, candidate)).toBe(expected);
		});
	});

	describe('ownerOfGitDir', () => {
		it.each([
			['/top/.git', '/top'],
			['/top/.git/modules/sub', '/top'],
			['/data/.git/cache/repo/.git', '/data/.git/cache/repo'],
			['/srv/repo.git', '/srv/repo.git'],
			['/.git', '/'],
		])('maps %s to %s', (gitDir, expected) => {
			expect(ownerOfGitDir(gitDir as ResolvedFilePath)).toBe(expected);
		});
	});
});
