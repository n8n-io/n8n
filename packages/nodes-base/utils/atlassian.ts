import type {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	INodeListSearchResult,
	INodeParameterResourceLocator,
	IPollFunctions,
	IWebhookFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

type AtlassianContext =
	| IHookFunctions
	| IExecuteFunctions
	| ILoadOptionsFunctions
	| IPollFunctions
	| IWebhookFunctions;

export type AtlassianProduct = 'jira' | 'confluence';

const PRODUCT_NAMES: Record<AtlassianProduct, string> = {
	jira: 'Jira',
	confluence: 'Confluence',
};

export interface AccessibleResource {
	id: string;
	url: string;
	name?: string;
}

// credentialId → accessible-resources, kept for the life of the process. Keyed
// per credential so cache timing can't reveal which sites other credentials reach.
const accessibleResourcesCache = new Map<string, AccessibleResource[]>();

const hasSiteId = (resource: AccessibleResource) =>
	typeof resource?.id === 'string' && resource.id !== '';

export function clearAtlassianAccessibleResourcesCache() {
	accessibleResourcesCache.clear();
}

/**
 * Extracts the hostname from a site URL pasted in any reasonable form: with or
 * without a scheme, with a trailing slash, with a path like /wiki, any casing.
 * Throws on input that doesn't contain a parseable hostname.
 */
export function extractAtlassianSiteHostname(siteUrl: string): string {
	const trimmed = siteUrl.trim();
	const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
	return new URL(withScheme).hostname.toLowerCase();
}

export function getAtlassianApiBaseUrl(product: AtlassianProduct, cloudId: string): string {
	return `https://api.atlassian.com/ex/${product}/${encodeURIComponent(cloudId)}`;
}

async function loadAccessibleResources(
	this: AtlassianContext,
	credentialType: string,
	bypassCache: boolean,
): Promise<{ resources: AccessibleResource[]; fromCache: boolean }> {
	const rawCredentialId = this.getNode().credentials?.[credentialType]?.id;
	const credentialId =
		typeof rawCredentialId === 'string' && rawCredentialId !== '' ? rawCredentialId : undefined;

	if (!bypassCache && credentialId !== undefined) {
		const cached = accessibleResourcesCache.get(credentialId);
		if (cached) return { resources: cached, fromCache: true };
	}

	let resources: AccessibleResource[];
	try {
		resources = await this.helpers.httpRequestWithAuthentication.call(this, credentialType, {
			method: 'GET',
			url: 'https://api.atlassian.com/oauth/token/accessible-resources',
			json: true,
		});
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}

	if (!Array.isArray(resources)) resources = [];
	if (credentialId !== undefined) accessibleResourcesCache.set(credentialId, resources);
	return { resources, fromCache: false };
}

/**
 * Fetches the sites this OAuth2 connection can access, cached per credential
 * per process. `bypassCache` forces a refresh (used by site dropdowns so a
 * site granted after a reconnect shows up without a restart).
 */
export async function fetchAtlassianAccessibleResources(
	this: AtlassianContext,
	credentialType: string,
	{ bypassCache = false }: { bypassCache?: boolean } = {},
): Promise<AccessibleResource[]> {
	return (await loadAccessibleResources.call(this, credentialType, bypassCache)).resources;
}

export async function searchAtlassianSites(
	this: ILoadOptionsFunctions,
	credentialType: string,
	filter?: string,
): Promise<INodeListSearchResult> {
	const filterLower = (filter ?? '').trim().toLowerCase();

	// Filtering is local, so only the unfiltered first load refreshes the cache
	const resources = await fetchAtlassianAccessibleResources.call(this, credentialType, {
		bypassCache: filterLower === '',
	});

	const results = resources
		.filter(hasSiteId)
		.map((site) => {
			const url = typeof site.url === 'string' && site.url !== '' ? site.url : undefined;
			const name = typeof site.name === 'string' && site.name !== '' ? site.name : (url ?? site.id);
			return { name, value: site.id, url };
		})
		.filter(
			(item) =>
				filterLower === '' ||
				item.name.toLowerCase().includes(filterLower) ||
				(item.url ?? '').toLowerCase().includes(filterLower),
		)
		.sort((a, b) => a.name.localeCompare(b.name));

	return { results };
}

const isResourceLocator = (value: unknown): value is INodeParameterResourceLocator =>
	typeof value === 'object' && value !== null && 'value' in value;

export function getAtlassianSiteParameter(
	ctx: AtlassianContext,
): INodeParameterResourceLocator | undefined {
	const raw =
		'getCurrentNodeParameter' in ctx
			? ctx.getCurrentNodeParameter('site')
			: ctx.getNodeParameter('site', 0);

	return isResourceLocator(raw) ? raw : undefined;
}

/** The cache lives for the life of the process, so a cached list that can't answer
 * the caller is refetched once — otherwise a newly granted site stays invisible. */
async function getAccessibleResourcesOrRefetch(
	this: AtlassianContext,
	credentialType: string,
	isSufficient: (resources: AccessibleResource[]) => boolean,
): Promise<AccessibleResource[]> {
	const first = await loadAccessibleResources.call(this, credentialType, false);
	if (!first.fromCache || isSufficient(first.resources)) return first.resources;

	return (await loadAccessibleResources.call(this, credentialType, true)).resources;
}

// Capped at 5 so a bogus site selection can't dump the full site list into persisted execution data
function formatReachableSites(resources: AccessibleResource[]): string {
	const urls = resources
		.filter((resource) => typeof resource?.url === 'string' && resource.url !== '')
		.map((resource) => resource.url);
	if (urls.length === 0) return 'no sites';
	return urls.slice(0, 5).join(', ') + (urls.length > 5 ? `, and ${urls.length - 5} more` : '');
}

/**
 * Resolves a site URL to its cloudId by matching its hostname (case-insensitively)
 * against the sites the OAuth2 connection can access.
 */
export async function getAtlassianCloudId(
	this: AtlassianContext,
	credentialType: string,
	siteUrl: string,
	product: AtlassianProduct,
): Promise<string> {
	let hostname: string;
	try {
		hostname = extractAtlassianSiteHostname(siteUrl);
	} catch {
		throw new NodeOperationError(
			this.getNode(),
			`"${siteUrl}" is not a valid Atlassian site URL. Expected something like https://your-site.atlassian.net.`,
		);
	}

	const matchHostname = (resources: AccessibleResource[]) =>
		resources.find((resource) => {
			try {
				return new URL(resource.url).hostname.toLowerCase() === hostname;
			} catch {
				return false;
			}
		});

	const resources = await getAccessibleResourcesOrRefetch.call(
		this,
		credentialType,
		(candidates) => matchHostname(candidates) !== undefined,
	);
	const site = matchHostname(resources);

	if (!site) {
		throw new NodeOperationError(
			this.getNode(),
			`No ${PRODUCT_NAMES[product]} site matched "${siteUrl}". This connection can access: ${formatReachableSites(
				resources,
			)}.`,
		);
	}

	return site.id;
}

/**
 * Resolves a node's top-level Site parameter to a cloudId. From List stores the
 * cloudId directly (accessible-resources returns it); By URL is hostname-matched
 * against the connection's sites; an empty value auto-resolves when the
 * connection reaches exactly one site and errors listing the candidates otherwise.
 */
export async function resolveAtlassianCloudId(
	this: AtlassianContext,
	credentialType: string,
	site: INodeParameterResourceLocator | undefined,
	product: AtlassianProduct,
): Promise<string> {
	const value =
		typeof site?.value === 'string' || typeof site?.value === 'number'
			? String(site.value).trim()
			: '';

	if (value !== '') {
		if (site?.mode === 'url') {
			return await getAtlassianCloudId.call(this, credentialType, value, product);
		}
		return value;
	}

	const resources = await getAccessibleResourcesOrRefetch.call(this, credentialType, (candidates) =>
		candidates.some(hasSiteId),
	);
	const sites = resources.filter(hasSiteId);

	if (sites.length === 0) {
		throw new NodeOperationError(
			this.getNode(),
			`This connection cannot access any ${PRODUCT_NAMES[product]} sites. Reconnect the credential and grant it access to a site.`,
		);
	}
	if (sites.length === 1) return sites[0].id;

	throw new NodeOperationError(
		this.getNode(),
		`This connection can access: ${formatReachableSites(sites)} — pick a site in the 'Site' parameter.`,
	);
}
