import type {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IPollFunctions,
	IWebhookFunctions,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

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

// Module-level cache: site hostname → cloudId (persists for the life of the n8n process)
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
	return `https://api.atlassian.com/ex/${product}/${cloudId}`;
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

	const cached = cloudIdCache.get(hostname);
	if (cached) return cached;

	const resources = (await this.helpers.requestWithAuthentication.call(this, credentialType, {
		uri: 'https://api.atlassian.com/oauth/token/accessible-resources',
		json: true,
	})) as Array<{ id: string; url: string }>;

	const site = resources.find((resource) => {
		try {
			return new URL(resource.url).hostname.toLowerCase() === hostname;
		} catch {
			return false;
		}
	});

	if (!site) {
		const accessibleUrls = resources.map((resource) => resource.url).join(', ');
		throw new NodeOperationError(
			this.getNode(),
			`No ${PRODUCT_NAMES[product]} site matched "${hostname}". This connection can access: ${
				accessibleUrls || 'no sites'
			}.`,
		);
	}

	cloudIdCache.set(hostname, site.id);
	return site.id;
}
