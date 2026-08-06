import type { IExecuteFunctions } from 'n8n-workflow';
import { type DeepMockProxy, mockDeep } from 'vitest-mock-extended';

import {
	clearAtlassianCloudIdCache,
	extractAtlassianSiteHostname,
	getAtlassianApiBaseUrl,
	getAtlassianCloudId,
} from '../atlassian';

describe('extractAtlassianSiteHostname', () => {
	it.each([
		['https://example.atlassian.net', 'example.atlassian.net'],
		['http://example.atlassian.net', 'example.atlassian.net'],
		['example.atlassian.net', 'example.atlassian.net'],
		['https://example.atlassian.net/', 'example.atlassian.net'],
		['https://example.atlassian.net/wiki', 'example.atlassian.net'],
		['https://example.atlassian.net/wiki/spaces/DOCS/pages/123', 'example.atlassian.net'],
		['example.atlassian.net/wiki/', 'example.atlassian.net'],
		['HTTPS://Example.Atlassian.NET/Wiki', 'example.atlassian.net'],
		['  https://example.atlassian.net  ', 'example.atlassian.net'],
	])('should extract %s → %s', (input, expected) => {
		expect(extractAtlassianSiteHostname(input)).toBe(expected);
	});

	it.each([[''], ['   '], ['https://']])('should throw on unparseable input %j', (input) => {
		expect(() => extractAtlassianSiteHostname(input)).toThrow();
	});
});

describe('getAtlassianApiBaseUrl', () => {
	it('should build the product-scoped API base URL', () => {
		expect(getAtlassianApiBaseUrl('confluence', 'abc-123')).toBe(
			'https://api.atlassian.com/ex/confluence/abc-123',
		);
		expect(getAtlassianApiBaseUrl('jira', 'abc-123')).toBe(
			'https://api.atlassian.com/ex/jira/abc-123',
		);
	});
});

describe('getAtlassianCloudId', () => {
	let mockExecuteFunctions: DeepMockProxy<IExecuteFunctions>;
	const credentialType = 'confluenceCloudOAuth2Api';
	const cloudId = 'abc123-cloud-id';

	beforeEach(() => {
		clearAtlassianCloudIdCache();
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockExecuteFunctions.helpers.requestWithAuthentication.mockResolvedValue([
			{ id: cloudId, url: 'https://example.atlassian.net' },
			{ id: 'other-cloud-id', url: 'https://other.atlassian.net' },
		]);
	});

	it('should resolve the cloudId via accessible-resources', async () => {
		const result = await getAtlassianCloudId.call(
			mockExecuteFunctions,
			credentialType,
			'https://example.atlassian.net',
			'confluence',
		);

		expect(result).toBe(cloudId);
		expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			credentialType,
			expect.objectContaining({
				uri: 'https://api.atlassian.com/oauth/token/accessible-resources',
			}),
		);
	});

	it.each([
		['example.atlassian.net'],
		['http://example.atlassian.net'],
		['https://example.atlassian.net/'],
		['https://example.atlassian.net/wiki/spaces/DOCS'],
		['EXAMPLE.Atlassian.NET/wiki'],
	])('should resolve pasted form %s', async (siteUrl) => {
		const result = await getAtlassianCloudId.call(
			mockExecuteFunctions,
			credentialType,
			siteUrl,
			'confluence',
		);

		expect(result).toBe(cloudId);
	});

	it('should cache the cloudId per hostname', async () => {
		await getAtlassianCloudId.call(
			mockExecuteFunctions,
			credentialType,
			'https://example.atlassian.net',
			'confluence',
		);
		const second = await getAtlassianCloudId.call(
			mockExecuteFunctions,
			credentialType,
			'example.atlassian.net/wiki',
			'confluence',
		);

		expect(second).toBe(cloudId);
		expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledTimes(1);
	});

	it('should throw an actionable error naming the accessible sites when no site matches', async () => {
		await expect(
			getAtlassianCloudId.call(
				mockExecuteFunctions,
				credentialType,
				'https://unknown.atlassian.net',
				'confluence',
			),
		).rejects.toThrow(
			'No Confluence site matched "unknown.atlassian.net". This connection can access: https://example.atlassian.net, https://other.atlassian.net.',
		);
	});

	it('should name the product in the error message', async () => {
		await expect(
			getAtlassianCloudId.call(
				mockExecuteFunctions,
				'jiraSoftwareCloudOAuth2Api',
				'https://unknown.atlassian.net',
				'jira',
			),
		).rejects.toThrow(/No Jira site matched/);
	});

	it('should say "no sites" when the connection can access none', async () => {
		mockExecuteFunctions.helpers.requestWithAuthentication.mockResolvedValue([]);

		await expect(
			getAtlassianCloudId.call(
				mockExecuteFunctions,
				credentialType,
				'https://example.atlassian.net',
				'confluence',
			),
		).rejects.toThrow(
			'No Confluence site matched "example.atlassian.net". This connection can access: no sites.',
		);
	});

	it('should throw a clear error on unparseable site URL', async () => {
		await expect(
			getAtlassianCloudId.call(mockExecuteFunctions, credentialType, '', 'confluence'),
		).rejects.toThrow('"" is not a valid Atlassian site URL');
		expect(mockExecuteFunctions.helpers.requestWithAuthentication).not.toHaveBeenCalled();
	});
});
