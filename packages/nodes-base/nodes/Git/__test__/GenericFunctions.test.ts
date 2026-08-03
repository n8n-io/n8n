import { mockDeep } from 'vitest-mock-extended';
import type { ConfigListSummary } from 'simple-git';
import type { INode } from 'n8n-workflow';

import { getConfiguredRemoteRepositories, mapGitConfigList } from '../GenericFunctions';

describe('GenericFunctions', () => {
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
