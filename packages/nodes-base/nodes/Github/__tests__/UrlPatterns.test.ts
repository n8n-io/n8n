import { Github } from '../Github.node';
import { GithubTrigger } from '../GithubTrigger.node';

interface ValidationRule {
	type: string;
	properties: {
		regex: string;
		errorMessage: string;
	};
}

describe('GitHub Node URL Pattern Tests', () => {
	let githubNode: Github;
	let githubTriggerNode: GithubTrigger;

	const getOwnerUrlMode = () => {
		const ownerParam = githubNode.description.properties.find((prop) => prop.name === 'owner');
		return ownerParam?.modes?.find((mode) => mode.name === 'url');
	};

	const getRepositoryUrlMode = () => {
		const repoParam = githubNode.description.properties.find((prop) => prop.name === 'repository');
		return repoParam?.modes?.find((mode) => mode.name === 'url');
	};

	const getOwnerExtractRegex = () => {
		const mode = getOwnerUrlMode();
		return new RegExp(mode?.extractValue?.regex ?? '');
	};

	const getOwnerValidationRegex = () => {
		const mode = getOwnerUrlMode();
		const validation = mode?.validation?.[0] as ValidationRule;
		return new RegExp(validation?.properties?.regex ?? '');
	};

	const getRepositoryExtractRegex = () => {
		const mode = getRepositoryUrlMode();
		return new RegExp(mode?.extractValue?.regex ?? '');
	};

	const getRepositoryValidationRegex = () => {
		const mode = getRepositoryUrlMode();
		const validation = mode?.validation?.[0] as ValidationRule;
		return new RegExp(validation?.properties?.regex ?? '');
	};

	// Helper functions for GithubTrigger node
	const getTriggerOwnerUrlMode = () => {
		const ownerParam = githubTriggerNode.description.properties.find(
			(prop) => prop.name === 'owner',
		);
		return ownerParam?.modes?.find((mode) => mode.name === 'url');
	};

	const getTriggerRepositoryUrlMode = () => {
		const repoParam = githubTriggerNode.description.properties.find(
			(prop) => prop.name === 'repository',
		);
		return repoParam?.modes?.find((mode) => mode.name === 'url');
	};

	const getTriggerOwnerExtractRegex = () => {
		const mode = getTriggerOwnerUrlMode();
		return new RegExp(mode?.extractValue?.regex ?? '');
	};

	const getTriggerOwnerValidationRegex = () => {
		const mode = getTriggerOwnerUrlMode();
		const validation = mode?.validation?.[0] as ValidationRule;
		return new RegExp(validation?.properties?.regex ?? '');
	};

	const getTriggerRepositoryExtractRegex = () => {
		const mode = getTriggerRepositoryUrlMode();
		return new RegExp(mode?.extractValue?.regex ?? '');
	};

	const getTriggerRepositoryValidationRegex = () => {
		const mode = getTriggerRepositoryUrlMode();
		const validation = mode?.validation?.[0] as ValidationRule;
		return new RegExp(validation?.properties?.regex ?? '');
	};

	beforeEach(() => {
		githubNode = new Github();
		githubTriggerNode = new GithubTrigger();
	});

	describe('GitHub Node Resource Locator Patterns', () => {
		describe('Owner URL Pattern', () => {
			it('should extract owner from github.com URL', () => {
				const regex = getOwnerExtractRegex();
				const url = 'https://github.com/n8n-io';
				const match = url.match(regex);
				expect(match?.[1]).toBe('n8n-io');
			});

			it('should extract owner from custom GitHub URL', () => {
				const regex = getOwnerExtractRegex();
				const url = 'https://github.company.com/acme-corp';
				const match = url.match(regex);
				expect(match?.[1]).toBe('acme-corp');
			});

			it('should validate github.com URL', () => {
				const validationRegex = getOwnerValidationRegex();
				const url = 'https://github.com/n8n-io';
				expect(validationRegex.test(url)).toBe(true);
			});

			it('should validate custom GitHub URL', () => {
				const validationRegex = getOwnerValidationRegex();
				const url = 'https://github.company.com/acme-corp';
				expect(validationRegex.test(url)).toBe(true);
			});

			it('should reject invalid URLs', () => {
				const validationRegex = getOwnerValidationRegex();
				expect(validationRegex.test('not-a-url')).toBe(false);
				expect(validationRegex.test('http://github.com/user')).toBe(false);
				expect(validationRegex.test('https://')).toBe(false);
			});
		});

		describe('Repository URL Pattern', () => {
			it('should extract repository from github.com URL', () => {
				const regex = getRepositoryExtractRegex();
				const url = 'https://github.com/n8n-io/n8n';
				const match = url.match(regex);
				expect(match?.[1]).toBe('n8n');
			});

			it('should extract repository from custom GitHub URL', () => {
				const regex = getRepositoryExtractRegex();
				const url = 'https://github.company.com/acme-corp/my-repo';
				const match = url.match(regex);
				expect(match?.[1]).toBe('my-repo');
			});

			it('should validate github.com repository URL', () => {
				const validationRegex = getRepositoryValidationRegex();
				const url = 'https://github.com/n8n-io/n8n';
				expect(validationRegex.test(url)).toBe(true);
			});

			it('should validate custom GitHub repository URL', () => {
				const validationRegex = getRepositoryValidationRegex();
				const url = 'https://github.company.com/acme-corp/my-repo';
				expect(validationRegex.test(url)).toBe(true);
			});

			it('should validate URLs with additional paths', () => {
				const validationRegex = getRepositoryValidationRegex();
				expect(validationRegex.test('https://github.com/n8n-io/n8n/issues/123')).toBe(true);
				expect(validationRegex.test('https://github.company.com/org/repo/pulls')).toBe(true);
			});

			it('should reject invalid repository URLs', () => {
				const validationRegex = getRepositoryValidationRegex();
				expect(validationRegex.test('https://github.com/user')).toBe(false);
				expect(validationRegex.test('not-a-url')).toBe(false);
				expect(validationRegex.test('https://')).toBe(false);
			});
		});
	});

	describe('GitHub Trigger Node Resource Locator Patterns', () => {
		describe('Owner URL Pattern', () => {
			it('should extract owner from github.com URL', () => {
				const regex = getTriggerOwnerExtractRegex();
				const url = 'https://github.com/n8n-io';
				const match = url.match(regex);
				expect(match?.[1]).toBe('n8n-io');
			});

			it('should extract owner from custom GitHub URL', () => {
				const regex = getTriggerOwnerExtractRegex();
				const url = 'https://github.company.com/my-org';
				const match = url.match(regex);
				expect(match?.[1]).toBe('my-org');
			});

			it('should validate github.com URL', () => {
				const validationRegex = getTriggerOwnerValidationRegex();
				const url = 'https://github.com/n8n-io';
				expect(validationRegex.test(url)).toBe(true);
			});

			it('should validate custom GitHub URL', () => {
				const validationRegex = getTriggerOwnerValidationRegex();
				const url = 'https://github.company.com/my-org';
				expect(validationRegex.test(url)).toBe(true);
			});
		});

		describe('Repository URL Pattern', () => {
			it('should extract repository from github.com URL', () => {
				const regex = getTriggerRepositoryExtractRegex();
				const url = 'https://github.com/n8n-io/n8n';
				const match = url.match(regex);
				expect(match?.[1]).toBe('n8n');
			});

			it('should extract repository from custom GitHub URL', () => {
				const regex = getTriggerRepositoryExtractRegex();
				const url = 'https://github.company.com/my-org/my-repo';
				const match = url.match(regex);
				expect(match?.[1]).toBe('my-repo');
			});

			it('should validate github.com repository URL', () => {
				const validationRegex = getTriggerRepositoryValidationRegex();
				const url = 'https://github.com/n8n-io/n8n';
				expect(validationRegex.test(url)).toBe(true);
			});

			it('should validate custom GitHub repository URL', () => {
				const validationRegex = getTriggerRepositoryValidationRegex();
				const url = 'https://github.company.com/my-org/my-repo';
				expect(validationRegex.test(url)).toBe(true);
			});
		});
	});

	describe('URL Pattern Edge Cases', () => {
		it('should handle URLs with subdomains', () => {
			const ownerRegex = getOwnerExtractRegex();
			const repoRegex = getRepositoryExtractRegex();

			// Test complex custom URLs
			expect('https://git.internal.company.com/dev-team'.match(ownerRegex)?.[1]).toBe('dev-team');
			expect('https://github.acme.corp/engineering/backend-api'.match(repoRegex)?.[1]).toBe(
				'backend-api',
			);
		});

		it('should handle URLs with ports', () => {
			const ownerRegex = getOwnerExtractRegex();
			const repoRegex = getRepositoryExtractRegex();

			// Test URLs with ports
			expect('https://github.local:8080/testuser'.match(ownerRegex)?.[1]).toBe('testuser');
			expect('https://git.company.com:443/org/project'.match(repoRegex)?.[1]).toBe('project');
		});

		it('should handle URLs with additional path segments', () => {
			const ownerValidationRegex = getOwnerValidationRegex();
			const repoValidationRegex = getRepositoryValidationRegex();

			// Test URLs with extra paths
			expect(ownerValidationRegex.test('https://github.com/user/settings')).toBe(true);
			expect(repoValidationRegex.test('https://github.com/user/repo/issues/123')).toBe(true);
			expect(repoValidationRegex.test('https://git.company.com/org/project/pulls')).toBe(true);
		});
	});
});
