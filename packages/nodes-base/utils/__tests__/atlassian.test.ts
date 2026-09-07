import type { IExecuteFunctions, INode, INodeParameterResourceLocator } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import type { Mock, Mocked } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import type { AccessibleResource } from '../atlassian';
import {
	clearAtlassianAccessibleResourcesCache,
	extractAtlassianSiteHostname,
	fetchAtlassianAccessibleResources,
	getAtlassianApiBaseUrl,
	getAtlassianCloudId,
	resolveAtlassianCloudId,
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

	it('should URL-encode the cloudId', () => {
		expect(getAtlassianApiBaseUrl('jira', 'a/b c')).toBe(
			'https://api.atlassian.com/ex/jira/a%2Fb%20c',
		);
	});
});

describe('getAtlassianCloudId', () => {
	const credentialType = 'confluenceCloudOAuth2Api';
	const accessibleResources: AccessibleResource[] = [
		{ id: 'cloud-1', url: 'https://example.atlassian.net', name: 'example' },
		{ id: 'cloud-2', url: 'https://Other.Atlassian.NET' },
	];

	let ctx: Mocked<IExecuteFunctions>;
	let mockNode: INode;
	let mockHttpRequestWithAuthentication: Mock;

	beforeEach(() => {
		vi.clearAllMocks();
		clearAtlassianAccessibleResourcesCache();
		ctx = mockDeep<IExecuteFunctions>();
		mockHttpRequestWithAuthentication = vi.fn().mockResolvedValue(accessibleResources);
		ctx.helpers.httpRequestWithAuthentication = mockHttpRequestWithAuthentication;

		mockNode = {
			id: 'test-node',
			name: 'Test Node',
			type: 'n8n-nodes-base.confluence',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
			credentials: { [credentialType]: { id: 'cred-1', name: 'account' } },
		};
		ctx.getNode.mockReturnValue(mockNode);
	});

	it('should resolve the cloudId via accessible-resources', async () => {
		const result = await getAtlassianCloudId.call(
			ctx,
			credentialType,
			'https://example.atlassian.net',
			'confluence',
		);

		expect(result).toBe('cloud-1');
		expect(mockHttpRequestWithAuthentication).toHaveBeenCalledTimes(1);
		expect(mockHttpRequestWithAuthentication).toHaveBeenCalledWith(
			credentialType,
			expect.objectContaining({
				url: 'https://api.atlassian.com/oauth/token/accessible-resources',
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
		const result = await getAtlassianCloudId.call(ctx, credentialType, siteUrl, 'confluence');

		expect(result).toBe('cloud-1');
	});

	it('should match hostnames case-insensitively on both sides', async () => {
		const result = await getAtlassianCloudId.call(
			ctx,
			credentialType,
			'OTHER.atlassian.net/wiki',
			'confluence',
		);

		expect(result).toBe('cloud-2');
	});

	it('should skip entries with malformed URLs instead of throwing', async () => {
		mockHttpRequestWithAuthentication.mockResolvedValueOnce([
			{ id: 'bad', url: 'not a url' },
			...accessibleResources,
		]);

		const result = await getAtlassianCloudId.call(
			ctx,
			credentialType,
			'example.atlassian.net',
			'confluence',
		);

		expect(result).toBe('cloud-1');
	});

	it('should serve the second lookup from the cache without refetching', async () => {
		const first = await getAtlassianCloudId.call(
			ctx,
			credentialType,
			'https://example.atlassian.net/wiki',
			'confluence',
		);
		const second = await getAtlassianCloudId.call(
			ctx,
			credentialType,
			'example.atlassian.net',
			'confluence',
		);

		expect(first).toBe('cloud-1');
		expect(second).toBe('cloud-1');
		expect(mockHttpRequestWithAuthentication).toHaveBeenCalledTimes(1);
	});

	it('should refetch once when the cached list has no match, so a newly granted site resolves', async () => {
		mockHttpRequestWithAuthentication.mockResolvedValueOnce([accessibleResources[0]]);
		await getAtlassianCloudId.call(ctx, credentialType, 'example.atlassian.net', 'confluence');

		const result = await getAtlassianCloudId.call(
			ctx,
			credentialType,
			'other.atlassian.net',
			'confluence',
		);

		expect(result).toBe('cloud-2');
		expect(mockHttpRequestWithAuthentication).toHaveBeenCalledTimes(2);
	});

	it('should not refetch when the list it just fetched has no match', async () => {
		await expect(
			getAtlassianCloudId.call(ctx, credentialType, 'missing.atlassian.net', 'confluence'),
		).rejects.toThrow('No Confluence site matched');

		expect(mockHttpRequestWithAuthentication).toHaveBeenCalledTimes(1);
	});

	it('should share one cache entry across products for the same credential and hostname', async () => {
		const viaJira = await getAtlassianCloudId.call(
			ctx,
			credentialType,
			'example.atlassian.net',
			'jira',
		);
		const viaConfluence = await getAtlassianCloudId.call(
			ctx,
			credentialType,
			'example.atlassian.net',
			'confluence',
		);

		expect(viaJira).toBe('cloud-1');
		expect(viaConfluence).toBe('cloud-1');
		expect(mockHttpRequestWithAuthentication).toHaveBeenCalledTimes(1);
	});

	it('should not share the cache across credentials', async () => {
		ctx.getNode.mockReturnValue({
			...mockNode,
			credentials: { [credentialType]: { id: 'cred-a', name: 'A' } },
		});
		await getAtlassianCloudId.call(ctx, credentialType, 'example.atlassian.net', 'confluence');

		ctx.getNode.mockReturnValue({
			...mockNode,
			credentials: { [credentialType]: { id: 'cred-b', name: 'B' } },
		});
		await getAtlassianCloudId.call(ctx, credentialType, 'example.atlassian.net', 'confluence');

		expect(mockHttpRequestWithAuthentication).toHaveBeenCalledTimes(2);
	});

	it('should name the input and list reachable site URLs when nothing matches', async () => {
		const promise = getAtlassianCloudId.call(
			ctx,
			credentialType,
			'foo.atlassian.net',
			'confluence',
		);

		await expect(promise).rejects.toThrow(NodeOperationError);
		await expect(promise).rejects.toThrow(
			'No Confluence site matched "foo.atlassian.net". This connection can access: https://example.atlassian.net, https://Other.Atlassian.NET.',
		);
	});

	it('should name the product in the error message', async () => {
		await expect(
			getAtlassianCloudId.call(
				ctx,
				'jiraSoftwareCloudOAuth2Api',
				'https://unknown.atlassian.net',
				'jira',
			),
		).rejects.toThrow(/No Jira site matched/);
	});

	it('should say "no sites" when the connection can access none', async () => {
		mockHttpRequestWithAuthentication.mockResolvedValueOnce([]);

		await expect(
			getAtlassianCloudId.call(ctx, credentialType, 'foo.atlassian.net', 'confluence'),
		).rejects.toThrow('can access: no sites');
	});

	it('should treat a non-array accessible-resources body as no sites', async () => {
		mockHttpRequestWithAuthentication.mockResolvedValueOnce({ error: 'unexpected' });

		await expect(
			getAtlassianCloudId.call(ctx, credentialType, 'foo.atlassian.net', 'confluence'),
		).rejects.toThrow('can access: no sites');
	});

	it('should cap the reachable-sites list at 5 entries', async () => {
		mockHttpRequestWithAuthentication.mockResolvedValueOnce(
			Array.from({ length: 7 }, (_, i) => ({
				id: `cloud-${i}`,
				url: `https://site-${i}.atlassian.net`,
			})),
		);

		await expect(
			getAtlassianCloudId.call(ctx, credentialType, 'foo.atlassian.net', 'confluence'),
		).rejects.toThrow(
			'This connection can access: https://site-0.atlassian.net, https://site-1.atlassian.net, https://site-2.atlassian.net, https://site-3.atlassian.net, https://site-4.atlassian.net, and 2 more',
		);
	});

	it('should omit malformed entries from the reachable-sites list', async () => {
		mockHttpRequestWithAuthentication.mockResolvedValueOnce([
			null,
			{ id: 'no-url' },
			{ id: 'cloud-1', url: 'https://example.atlassian.net' },
		]);

		await expect(
			getAtlassianCloudId.call(ctx, credentialType, 'foo.atlassian.net', 'confluence'),
		).rejects.toThrow('This connection can access: https://example.atlassian.net');
	});

	it('should throw a clear NodeOperationError on unparseable site URL', async () => {
		await expect(getAtlassianCloudId.call(ctx, credentialType, '', 'confluence')).rejects.toThrow(
			'"" is not a valid Atlassian site URL',
		);
		expect(mockHttpRequestWithAuthentication).not.toHaveBeenCalled();
	});

	it('should wrap an accessible-resources failure in NodeApiError, keeping status and message', async () => {
		mockHttpRequestWithAuthentication.mockRejectedValueOnce({
			message: 'boom',
			response: { status: 500 },
		});

		const error = await getAtlassianCloudId
			.call(ctx, credentialType, 'example.atlassian.net', 'confluence')
			.then(() => null)
			.catch((thrown: NodeApiError) => thrown);

		expect(error).toBeInstanceOf(NodeApiError);
		expect(error?.httpCode).toBe('500');
		expect(error?.messages).toContain('boom');
	});

	it('should pass an already-wrapped NodeApiError through unchanged', async () => {
		const wrapped = new NodeApiError(mockNode, { message: 'boom' }, { httpCode: '429' });
		mockHttpRequestWithAuthentication.mockRejectedValueOnce(wrapped);

		await expect(
			getAtlassianCloudId.call(ctx, credentialType, 'example.atlassian.net', 'confluence'),
		).rejects.toBe(wrapped);
	});
});

describe('fetchAtlassianAccessibleResources', () => {
	const credentialType = 'confluenceCloudOAuth2Api';
	const accessibleResources: AccessibleResource[] = [
		{ id: 'cloud-1', url: 'https://example.atlassian.net', name: 'example' },
	];

	let ctx: Mocked<IExecuteFunctions>;
	let mockHttpRequestWithAuthentication: Mock;

	beforeEach(() => {
		vi.clearAllMocks();
		clearAtlassianAccessibleResourcesCache();
		ctx = mockDeep<IExecuteFunctions>();
		mockHttpRequestWithAuthentication = vi.fn().mockResolvedValue(accessibleResources);
		ctx.helpers.httpRequestWithAuthentication = mockHttpRequestWithAuthentication;
		ctx.getNode.mockReturnValue({
			id: 'test-node',
			name: 'Test Node',
			type: 'n8n-nodes-base.confluence',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
			credentials: { [credentialType]: { id: 'cred-1', name: 'account' } },
		});
	});

	it('should fetch once and serve later calls from the per-credential cache', async () => {
		const first = await fetchAtlassianAccessibleResources.call(ctx, credentialType);
		const second = await fetchAtlassianAccessibleResources.call(ctx, credentialType);

		expect(first).toEqual(accessibleResources);
		expect(second).toEqual(accessibleResources);
		expect(mockHttpRequestWithAuthentication).toHaveBeenCalledTimes(1);
		expect(mockHttpRequestWithAuthentication).toHaveBeenCalledWith(
			credentialType,
			expect.objectContaining({
				url: 'https://api.atlassian.com/oauth/token/accessible-resources',
			}),
		);
	});

	it('should refetch and refresh the cache when bypassCache is set', async () => {
		await fetchAtlassianAccessibleResources.call(ctx, credentialType);

		const updated = [...accessibleResources, { id: 'cloud-2', url: 'https://new.atlassian.net' }];
		mockHttpRequestWithAuthentication.mockResolvedValueOnce(updated);
		const fresh = await fetchAtlassianAccessibleResources.call(ctx, credentialType, {
			bypassCache: true,
		});
		const cached = await fetchAtlassianAccessibleResources.call(ctx, credentialType);

		expect(fresh).toEqual(updated);
		expect(cached).toEqual(updated);
		expect(mockHttpRequestWithAuthentication).toHaveBeenCalledTimes(2);
	});

	it('should treat a non-array body as no resources', async () => {
		mockHttpRequestWithAuthentication.mockResolvedValueOnce({ error: 'unexpected' });

		await expect(fetchAtlassianAccessibleResources.call(ctx, credentialType)).resolves.toEqual([]);
	});

	it('should wrap a request failure in NodeApiError', async () => {
		mockHttpRequestWithAuthentication.mockRejectedValueOnce({
			message: 'boom',
			response: { status: 500 },
		});

		await expect(
			fetchAtlassianAccessibleResources.call(ctx, credentialType),
		).rejects.toBeInstanceOf(NodeApiError);
	});

	it('should skip the cache entirely when the node carries no credential ID', async () => {
		ctx.getNode.mockReturnValue({
			id: 'test-node',
			name: 'Test Node',
			type: 'n8n-nodes-base.confluence',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		});

		await fetchAtlassianAccessibleResources.call(ctx, credentialType);
		await fetchAtlassianAccessibleResources.call(ctx, credentialType);

		expect(mockHttpRequestWithAuthentication).toHaveBeenCalledTimes(2);
	});
});

describe('resolveAtlassianCloudId', () => {
	const credentialType = 'confluenceCloudOAuth2Api';
	const accessibleResources: AccessibleResource[] = [
		{ id: 'cloud-1', url: 'https://example.atlassian.net', name: 'example' },
		{ id: 'cloud-2', url: 'https://other.atlassian.net', name: 'other' },
	];

	let ctx: Mocked<IExecuteFunctions>;
	let mockHttpRequestWithAuthentication: Mock;

	const rlc = (mode: string, value: string): INodeParameterResourceLocator => ({
		__rl: true,
		mode,
		value,
	});

	beforeEach(() => {
		vi.clearAllMocks();
		clearAtlassianAccessibleResourcesCache();
		ctx = mockDeep<IExecuteFunctions>();
		mockHttpRequestWithAuthentication = vi.fn().mockResolvedValue(accessibleResources);
		ctx.helpers.httpRequestWithAuthentication = mockHttpRequestWithAuthentication;
		ctx.getNode.mockReturnValue({
			id: 'test-node',
			name: 'Test Node',
			type: 'n8n-nodes-base.confluence',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
			credentials: { [credentialType]: { id: 'cred-1', name: 'account' } },
		});
	});

	it('should return a From List value directly without any request', async () => {
		const result = await resolveAtlassianCloudId.call(
			ctx,
			credentialType,
			rlc('list', 'cloud-2'),
			'confluence',
		);

		expect(result).toBe('cloud-2');
		expect(mockHttpRequestWithAuthentication).not.toHaveBeenCalled();
	});

	it('should hostname-match a By URL value against accessible resources', async () => {
		const result = await resolveAtlassianCloudId.call(
			ctx,
			credentialType,
			rlc('url', 'https://other.atlassian.net/wiki'),
			'confluence',
		);

		expect(result).toBe('cloud-2');
		expect(mockHttpRequestWithAuthentication).toHaveBeenCalledTimes(1);
	});

	it('should list reachable sites when a By URL value matches nothing', async () => {
		await expect(
			resolveAtlassianCloudId.call(
				ctx,
				credentialType,
				rlc('url', 'https://missing.atlassian.net'),
				'confluence',
			),
		).rejects.toThrow(
			'No Confluence site matched "https://missing.atlassian.net". This connection can access: https://example.atlassian.net, https://other.atlassian.net.',
		);
	});

	it('should auto-resolve an empty selection when the connection reaches exactly one site', async () => {
		mockHttpRequestWithAuthentication.mockResolvedValueOnce([accessibleResources[0]]);

		const result = await resolveAtlassianCloudId.call(
			ctx,
			credentialType,
			rlc('list', ''),
			'confluence',
		);

		expect(result).toBe('cloud-1');
	});

	it('should auto-resolve when the site parameter is missing entirely', async () => {
		mockHttpRequestWithAuthentication.mockResolvedValueOnce([accessibleResources[0]]);

		const result = await resolveAtlassianCloudId.call(ctx, credentialType, undefined, 'confluence');

		expect(result).toBe('cloud-1');
	});

	it('should list the candidates and ask to pick a site when several are reachable', async () => {
		const promise = resolveAtlassianCloudId.call(
			ctx,
			credentialType,
			rlc('list', ''),
			'confluence',
		);

		await expect(promise).rejects.toThrow(NodeOperationError);
		await expect(promise).rejects.toThrow(
			"This connection can access: https://example.atlassian.net, https://other.atlassian.net — pick a site in the 'Site' parameter.",
		);
	});

	it('should cap the candidate list at 5 entries', async () => {
		mockHttpRequestWithAuthentication.mockResolvedValue(
			Array.from({ length: 7 }, (_, i) => ({
				id: `cloud-${i}`,
				url: `https://site-${i}.atlassian.net`,
			})),
		);

		await expect(
			resolveAtlassianCloudId.call(ctx, credentialType, rlc('list', ''), 'confluence'),
		).rejects.toThrow(', and 2 more');
	});

	it('should name the product when the connection reaches no sites', async () => {
		mockHttpRequestWithAuthentication.mockResolvedValue([]);

		await expect(
			resolveAtlassianCloudId.call(ctx, credentialType, rlc('list', ''), 'confluence'),
		).rejects.toThrow('This connection cannot access any Confluence sites');
	});

	it('should ignore sites the API returned without an ID', async () => {
		mockHttpRequestWithAuthentication.mockResolvedValue([
			{ id: '', url: 'https://broken.atlassian.net' },
			accessibleResources[1],
		]);

		await expect(
			resolveAtlassianCloudId.call(ctx, credentialType, rlc('list', ''), 'confluence'),
		).resolves.toBe('cloud-2');
	});

	it('should refetch once when the cached list came back empty', async () => {
		mockHttpRequestWithAuthentication.mockResolvedValueOnce([]);
		await expect(
			resolveAtlassianCloudId.call(ctx, credentialType, rlc('list', ''), 'confluence'),
		).rejects.toThrow('cannot access any Confluence sites');

		mockHttpRequestWithAuthentication.mockResolvedValueOnce([accessibleResources[0]]);
		const result = await resolveAtlassianCloudId.call(
			ctx,
			credentialType,
			rlc('list', ''),
			'confluence',
		);

		expect(result).toBe('cloud-1');
	});

	it('should trim the selected value before deciding between selection and auto-resolve', async () => {
		mockHttpRequestWithAuthentication.mockResolvedValueOnce([accessibleResources[1]]);

		const result = await resolveAtlassianCloudId.call(
			ctx,
			credentialType,
			rlc('list', '   '),
			'confluence',
		);

		expect(result).toBe('cloud-2');
	});
});
