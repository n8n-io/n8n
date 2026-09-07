import { isMcpOAuth2Authentication, shouldRefreshMcpOAuth2Token } from '../src/mcp-helpers';

describe('isMcpOAuth2Authentication', () => {
	it('returns true for the canonical "mcpOAuth2Api" type', () => {
		expect(isMcpOAuth2Authentication('mcpOAuth2Api')).toBe(true);
	});

	it('returns true for service-specific variants ending in "McpOAuth2Api"', () => {
		expect(isMcpOAuth2Authentication('notionMcpOAuth2Api')).toBe(true);
		expect(isMcpOAuth2Authentication('githubMcpOAuth2Api')).toBe(true);
		expect(isMcpOAuth2Authentication('slackMcpOAuth2Api')).toBe(true);
	});

	it('returns true for native OAuth2 credential naming conventions', () => {
		expect(isMcpOAuth2Authentication('oAuth2Api')).toBe(true);
		expect(isMcpOAuth2Authentication('githubOAuth2Api')).toBe(true);
		expect(isMcpOAuth2Authentication('gmailOAuth2')).toBe(true);
	});

	it('returns false for static auth types', () => {
		expect(isMcpOAuth2Authentication('bearerAuth')).toBe(false);
		expect(isMcpOAuth2Authentication('headerAuth')).toBe(false);
		expect(isMcpOAuth2Authentication('multipleHeadersAuth')).toBe(false);
		expect(isMcpOAuth2Authentication('none')).toBe(false);
	});

	it('returns false for an empty string', () => {
		expect(isMcpOAuth2Authentication('')).toBe(false);
	});
});

describe('shouldRefreshMcpOAuth2Token', () => {
	const now = 1_700_000_000_000;

	beforeEach(() => {
		vi.spyOn(Date, 'now').mockReturnValue(now);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('refreshes an expiring client credentials token without a refresh token', () => {
		expect(
			shouldRefreshMcpOAuth2Token(
				{ expires_in: 3600, n8n_expires_at: String(now + 60_000) },
				'clientCredentials',
			),
		).toBe(true);
	});

	it('does not refresh an authorization code token without a refresh token', () => {
		expect(
			shouldRefreshMcpOAuth2Token(
				{ expires_in: 3600, n8n_expires_at: String(now + 60_000) },
				'authorizationCode',
			),
		).toBe(false);
	});
});
