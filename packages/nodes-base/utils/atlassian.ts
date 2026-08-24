import type {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
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

// credentialId:hostname → cloudId, kept for the life of the process. Keyed per
// credential so cache timing can't reveal which sites other credentials reach.
const cloudIdCache = new Map<string, string>();

export function clearAtlassianCloudIdCache() {
	cloudIdCache.clear();
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

	const rawCredentialId = this.getNode().credentials?.[credentialType]?.id;
	const credentialId = typeof rawCredentialId === 'string' ? rawCredentialId : '';
	const cacheKey = `${credentialId}:${hostname}`;
	const cached = cloudIdCache.get(cacheKey);
	if (cached) return cached;

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

	const site = resources.find((resource) => {
		try {
			return new URL(resource.url).hostname.toLowerCase() === hostname;
		} catch {
			return false;
		}
	});

	if (!site) {
		// Capped at 5 so a bogus siteUrl can't dump the full site list into persisted execution data
		const urls = resources
			.filter((resource) => typeof resource?.url === 'string' && resource.url !== '')
			.map((resource) => resource.url);
		const reachable =
			urls.slice(0, 5).join(', ') + (urls.length > 5 ? `, and ${urls.length - 5} more` : '');
		throw new NodeOperationError(
			this.getNode(),
			`No ${PRODUCT_NAMES[product]} site matched "${siteUrl}". This connection can access: ${
				reachable || 'no sites'
			}.`,
		);
	}

	cloudIdCache.set(cacheKey, site.id);
	return site.id;
}
