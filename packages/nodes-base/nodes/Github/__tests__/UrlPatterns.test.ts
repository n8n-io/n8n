import { Github } from '../Github.node';
import { GithubTrigger } from '../GithubTrigger.node';

describe('GitHub Node URL Pattern Tests', () => {
	describe('GitHub Node Resource Locator Patterns', () => {
		let githubNode: Github;

		beforeEach(() => {
			githubNode = new Github();
		});

		describe('Owner URL Pattern', () => {
			const getOwnerUrlMode = () => {
				const ownerParam = githubNode.description.properties.find((prop) => prop.name === 'owner');
				return ownerParam?.modes?.find((mode) => mode.name === 'url');
			};

			it('should extract owner from github.com URL', () => {
				const mode = getOwnerUrlMode();
				const regex = new RegExp(mode?.extractValue?.regex || '');
				const url = 'https://github.com/n8n-io';
				const match = url.match(regex);
				expect(match?.[2]).toBe('n8n-io');
			});

			it('should extract owner from custom GitHub URL', () => {
				const mode = getOwnerUrlMode();
				const regex = new RegExp(mode?.extractValue?.regex || '');
				const url = 'https://github.company.com/acme-corp';
				const match = url.match(regex);
				expect(match?.[2]).toBe('acme-corp');
			});

			it('should validate github.com URL', () => {
				const mode = getOwnerUrlMode();
				const validation = mode?.validation?.[0] as any;
				const validationRegex = new RegExp(validation?.properties?.regex ?? '');
				const url = 'https://github.com/n8n-io';
				expect(validationRegex.test(url)).toBe(true);
			});

			it('should validate custom GitHub URL', () => {
				const mode = getOwnerUrlMode();
				const validation = mode?.validation?.[0] as any;
				const validationRegex = new RegExp(validation?.properties?.regex ?? '');
				const url = 'https://github.company.com/acme-corp';
				expect(validationRegex.test(url)).toBe(true);
			});

			it('should reject invalid URLs', () => {
				const mode = getOwnerUrlMode();
				const validation = mode?.validation?.[0] as any;
				const validationRegex = new RegExp(validation?.properties?.regex ?? '');
				expect(validationRegex.test('not-a-url')).toBe(false);
				expect(validationRegex.test('http://github.com/user')).toBe(false);
				expect(validationRegex.test('https://')).toBe(false);
			});
		});

		describe('Repository URL Pattern', () => {
			const getRepositoryUrlMode = () => {
				const repoParam = githubNode.description.properties.find(
					(prop) => prop.name === 'repository',
				);
				return repoParam?.modes?.find((mode) => mode.name === 'url');
			};

			it('should extract repository from github.com URL', () => {
				const mode = getRepositoryUrlMode();
				const regex = new RegExp(mode?.extractValue?.regex || '');
				const url = 'https://github.com/n8n-io/n8n';
				const match = url.match(regex);
				expect(match?.[2]).toBe('n8n');
			});

			it('should extract repository from custom GitHub URL', () => {
				const mode = getRepositoryUrlMode();
				const regex = new RegExp(mode?.extractValue?.regex || '');
				const url = 'https://github.company.com/acme-corp/my-repo';
				const match = url.match(regex);
				expect(match?.[2]).toBe('my-repo');
			});

			it('should validate github.com repository URL', () => {
				const mode = getRepositoryUrlMode();
				const validation = mode?.validation?.[0] as any;
				const validationRegex = new RegExp(validation?.properties?.regex ?? '');
				const url = 'https://github.com/n8n-io/n8n';
				expect(validationRegex.test(url)).toBe(true);
			});

			it('should validate custom GitHub repository URL', () => {
				const mode = getRepositoryUrlMode();
				const validation = mode?.validation?.[0] as any;
				const validationRegex = new RegExp(validation?.properties?.regex ?? '');
				const url = 'https://github.company.com/acme-corp/my-repo';
				expect(validationRegex.test(url)).toBe(true);
			});

			it('should validate URLs with additional paths', () => {
				const mode = getRepositoryUrlMode();
				const validation = mode?.validation?.[0] as any;
				const validationRegex = new RegExp(validation?.properties?.regex ?? '');
				expect(validationRegex.test('https://github.com/n8n-io/n8n/issues/123')).toBe(true);
				expect(validationRegex.test('https://github.company.com/org/repo/pulls')).toBe(true);
			});

			it('should reject invalid repository URLs', () => {
				const mode = getRepositoryUrlMode();
				const validation = mode?.validation?.[0] as any;
				const validationRegex = new RegExp(validation?.properties?.regex ?? '');
				expect(validationRegex.test('https://github.com/user')).toBe(false);
				expect(validationRegex.test('not-a-url')).toBe(false);
				expect(validationRegex.test('https://')).toBe(false);
			});
		});
	});

	describe('GitHub Trigger Node Resource Locator Patterns', () => {
		let githubTriggerNode: GithubTrigger;

		beforeEach(() => {
			githubTriggerNode = new GithubTrigger();
		});

		describe('Owner URL Pattern', () => {
			const getOwnerUrlMode = () => {
				const ownerParam = githubTriggerNode.description.properties.find(
					(prop) => prop.name === 'owner',
				);
				return ownerParam?.modes?.find((mode) => mode.name === 'url');
			};

			it('should extract owner from github.com URL', () => {
				const mode = getOwnerUrlMode();
				const regex = new RegExp(mode?.extractValue?.regex || '');
				const url = 'https://github.com/n8n-io';
				const match = url.match(regex);
				expect(match?.[2]).toBe('n8n-io');
			});

			it('should extract owner from custom GitHub URL', () => {
				const mode = getOwnerUrlMode();
				const regex = new RegExp(mode?.extractValue?.regex || '');
				const url = 'https://github.company.com/my-org';
				const match = url.match(regex);
				expect(match?.[2]).toBe('my-org');
			});

			it('should validate github.com URL', () => {
				const mode = getOwnerUrlMode();
				const validation = mode?.validation?.[0] as any;
				const validationRegex = new RegExp(validation?.properties?.regex ?? '');
				const url = 'https://github.com/n8n-io';
				expect(validationRegex.test(url)).toBe(true);
			});

			it('should validate custom GitHub URL', () => {
				const mode = getOwnerUrlMode();
				const validation = mode?.validation?.[0] as any;
				const validationRegex = new RegExp(validation?.properties?.regex ?? '');
				const url = 'https://github.company.com/my-org';
				expect(validationRegex.test(url)).toBe(true);
			});
		});

		describe('Repository URL Pattern', () => {
			const getRepositoryUrlMode = () => {
				const repoParam = githubTriggerNode.description.properties.find(
					(prop) => prop.name === 'repository',
				);
				return repoParam?.modes?.find((mode) => mode.name === 'url');
			};

			it('should extract repository from github.com URL', () => {
				const mode = getRepositoryUrlMode();
				const regex = new RegExp(mode?.extractValue?.regex || '');
				const url = 'https://github.com/n8n-io/n8n';
				const match = url.match(regex);
				expect(match?.[2]).toBe('n8n');
			});

			it('should extract repository from custom GitHub URL', () => {
				const mode = getRepositoryUrlMode();
				const regex = new RegExp(mode?.extractValue?.regex || '');
				const url = 'https://github.company.com/my-org/my-repo';
				const match = url.match(regex);
				expect(match?.[2]).toBe('my-repo');
			});

			it('should validate github.com repository URL', () => {
				const mode = getRepositoryUrlMode();
				const validation = mode?.validation?.[0] as any;
				const validationRegex = new RegExp(validation?.properties?.regex ?? '');
				const url = 'https://github.com/n8n-io/n8n';
				expect(validationRegex.test(url)).toBe(true);
			});

			it('should validate custom GitHub repository URL', () => {
				const mode = getRepositoryUrlMode();
				const validation = mode?.validation?.[0] as any;
				const validationRegex = new RegExp(validation?.properties?.regex ?? '');
				const url = 'https://github.company.com/my-org/my-repo';
				expect(validationRegex.test(url)).toBe(true);
			});
		});
	});

	describe('URL Pattern Edge Cases', () => {
		it('should handle URLs with subdomains', () => {
			const ownerPattern = /https:\/\/([^/]+)\/([-_0-9a-zA-Z]+)/;
			const repoPattern = /https:\/\/([^/]+)\/(?:[-_0-9a-zA-Z]+)\/([-_.0-9a-zA-Z]+)/;

			// Test complex custom URLs
			expect('https://git.internal.company.com/dev-team'.match(ownerPattern)?.[2]).toBe('dev-team');
			expect('https://github.acme.corp/engineering/backend-api'.match(repoPattern)?.[2]).toBe(
				'backend-api',
			);
		});

		it('should handle URLs with ports', () => {
			const ownerPattern = /https:\/\/([^/]+)\/([-_0-9a-zA-Z]+)/;
			const repoPattern = /https:\/\/([^/]+)\/(?:[-_0-9a-zA-Z]+)\/([-_.0-9a-zA-Z]+)/;

			// Test URLs with ports
			expect('https://github.local:8080/testuser'.match(ownerPattern)?.[2]).toBe('testuser');
			expect('https://git.company.com:443/org/project'.match(repoPattern)?.[2]).toBe('project');
		});

		it('should handle URLs with additional path segments', () => {
			const validationOwnerPattern = /https:\/\/([^/]+)\/([-_0-9a-zA-Z]+)(?:.*)/;
			const validationRepoPattern =
				/https:\/\/([^/]+)\/(?:[-_0-9a-zA-Z]+)\/([-_.0-9a-zA-Z]+)(?:.*)/;

			// Test URLs with extra paths
			expect(validationOwnerPattern.test('https://github.com/user/settings')).toBe(true);
			expect(validationRepoPattern.test('https://github.com/user/repo/issues/123')).toBe(true);
			expect(validationRepoPattern.test('https://git.company.com/org/project/pulls')).toBe(true);
		});
	});
});
