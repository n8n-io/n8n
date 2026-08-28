import type {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
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
	const rawCredentialId = this.getNode().credentials?.[credentialType]?.id;
	const credentialId = typeof rawCredentialId === 'string' ? rawCredentialId : '';

	if (!bypassCache) {
		const cached = accessibleResourcesCache.get(credentialId);
		if (cached) return cached;
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
	accessibleResourcesCache.set(credentialId, resources);
	return resources;
}

// Capped at 5 so a bogus site selection can't dump the full site list into persisted execution data
function formatReachableSites(resources: AccessibleResource[]): string {
	const urls = resources
		.filter((resource) => typeof resource?.url === 'string' && resource.url !== '')
		.map((resource) => resource.url);
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

	const resources = await fetchAtlassianAccessibleResources.call(this, credentialType);

	const site = resources.find((resource) => {
		try {
			return new URL(resource.url).hostname.toLowerCase() === hostname;
		} catch {
			return false;
		}
	});

	if (!site) {
		throw new NodeOperationError(
			this.getNode(),
			`No ${PRODUCT_NAMES[product]} site matched "${siteUrl}". This connection can access: ${
				formatReachableSites(resources) || 'no sites'
			}.`,
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

	const resources = await fetchAtlassianAccessibleResources.call(this, credentialType);
	if (resources.length === 0) {
		throw new NodeOperationError(
			this.getNode(),
			`This connection cannot access any ${PRODUCT_NAMES[product]} sites. Reconnect the credential and grant it access to a site.`,
		);
	}
	if (resources.length === 1 && typeof resources[0]?.id === 'string' && resources[0].id !== '') {
		return resources[0].id;
	}
	throw new NodeOperationError(
		this.getNode(),
		`This connection can access: ${formatReachableSites(resources)} — pick a site in the 'Site' parameter.`,
	);
}
