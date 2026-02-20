import { mockDeep } from 'jest-mock-extended';
import type { ConfigListSummary } from 'simple-git';

import { mapGitConfigList } from '../GenericFunctions';

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
});
