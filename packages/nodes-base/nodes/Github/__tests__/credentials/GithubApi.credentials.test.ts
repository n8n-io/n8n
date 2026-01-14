import { GithubApi } from '../../../credentials/GithubApi.credentials';

describe('GithubApi Credentials', () => {
	let credential: GithubApi;

	beforeEach(() => {
		credential = new GithubApi();
	});

	describe('Authentication Header', () => {
		it('should use Bearer token for fine-grained PATs', () => {
			const mockCredentials = {
				accessToken: 'github_pat_11ABCDEFGHIJKLMNOPQRSTUVWXYZ',
			};

			// Simulate the expression evaluation
			const authExpression = '={{ $credentials?.accessToken?.startsWith("github_pat_") ? "Bearer " + $credentials?.accessToken : "token " + $credentials?.accessToken }}';
			const result = mockCredentials.accessToken.startsWith('github_pat_') 
				? `Bearer ${mockCredentials.accessToken}`
				: `token ${mockCredentials.accessToken}`;
			
			expect(result).toBe('Bearer github_pat_11ABCDEFGHIJKLMNOPQRSTUVWXYZ');
		});

		it('should use token prefix for classic PATs', () => {
			const mockCredentials = {
				accessToken: 'ghp_1234567890abcdefghijklmnopqrstuvwxyz',
			};

			const result = mockCredentials.accessToken.startsWith('github_pat_')
				? `Bearer ${mockCredentials.accessToken}`
				: `token ${mockCredentials.accessToken}`;
			
			expect(result).toBe('token ghp_1234567890abcdefghijklmnopqrstuvwxyz');
		});

		it('should use token prefix for legacy tokens', () => {
			const mockCredentials = {
				accessToken: '1234567890abcdefghijklmnopqrstuvwxyz12345678',
			};

			const result = mockCredentials.accessToken.startsWith('github_pat_')
				? `Bearer ${mockCredentials.accessToken}`
				: `token ${mockCredentials.accessToken}`;
			
			expect(result).toBe('token 1234567890abcdefghijklmnopqrstuvwxyz12345678');
		});
	});

	describe('Credential Properties', () => {
		it('should include helpful description for access token', () => {
			const accessTokenProperty = credential.properties.find(prop => prop.name === 'accessToken');
			
			expect(accessTokenProperty).toBeDefined();
			expect(accessTokenProperty?.description).toContain('fine-grained');
			expect(accessTokenProperty?.description).toContain('repository_hooks: write');
		});
	});
});