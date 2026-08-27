import { mockDeep } from 'vitest-mock-extended';
import type { ConfigListSummary } from 'simple-git';
import type { INode } from 'n8n-workflow';

import {
	getConfiguredRemoteRepositories,
	findBlacklistedKeys,
	mapGitConfigList,
} from '../GenericFunctions';

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
});
