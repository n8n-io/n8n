import { isMcpOAuth2Authentication, isOAuth2Authentication } from '../src/mcp-helpers';

describe('isOAuth2Authentication', () => {
	it('returns true for generic and MCP OAuth2 credential types', () => {
		expect(isOAuth2Authentication('oAuth2Api')).toBe(true);
		expect(isOAuth2Authentication('mcpOAuth2Api')).toBe(true);
		expect(isOAuth2Authentication('notionMcpOAuth2Api')).toBe(true);
		expect(isOAuth2Authentication('bearerAuth')).toBe(false);
	});

	it('does not widen the MCP-specific predicate', () => {
		expect(isOAuth2Authentication('oAuth2Api')).toBe(true);
		expect(isMcpOAuth2Authentication('oAuth2Api')).toBe(false);
	});
});

describe('isMcpOAuth2Authentication', () => {
	it('returns true for the canonical "mcpOAuth2Api" type', () => {
		expect(isMcpOAuth2Authentication('mcpOAuth2Api')).toBe(true);
	});

	it('returns true for service-specific variants ending in "McpOAuth2Api"', () => {
		expect(isMcpOAuth2Authentication('notionMcpOAuth2Api')).toBe(true);
		expect(isMcpOAuth2Authentication('githubMcpOAuth2Api')).toBe(true);
		expect(isMcpOAuth2Authentication('slackMcpOAuth2Api')).toBe(true);
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
