import type { IExecuteFunctions, INodeParameterResourceLocator } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import { microsoftApiRequest } from '../transport';

/** v1's Simplify $select list — the exact trimmed fields v2 keeps returning; Get Many reuses it. */
export const LIST_SIMPLIFY_SELECT =
	'id,name,displayName,description,createdDateTime,lastModifiedDateTime,webUrl';

// One URL lookup per distinct site URL per execution — without this, a
// multi-item run doubles its Graph request volume and risks 429 throttling.
const siteIdCache = new WeakMap<IExecuteFunctions, Map<string, string>>();

/**
 * Resolves the `site` resource locator to a Graph site ID; URL mode costs one
 * lookup via Graph path addressing. TEMPORARY: the site-selection follow-up
 * replaces this wholesale — keep all site-resolution logic here.
 */
export async function resolveSiteId(this: IExecuteFunctions, itemIndex: number): Promise<string> {
	const site = this.getNodeParameter('site', itemIndex) as INodeParameterResourceLocator;
	const value = String(site.value ?? '').trim();
	if (site.mode !== 'url') {
		return value;
	}

	let parsed: URL;
	try {
		parsed = new URL(value);
	} catch {
		throw new NodeOperationError(this.getNode(), 'The site URL is not valid', {
			description: 'Paste the full site address, e.g. https://contoso.sharepoint.com/sites/mysite',
		});
	}
	const path = parsed.pathname.replace(/\/+$/, '');
	const endpoint =
		path === '' ? `/v1.0/sites/${parsed.hostname}` : `/v1.0/sites/${parsed.hostname}:${path}`;

	let cache = siteIdCache.get(this);
	if (!cache) {
		cache = new Map();
		siteIdCache.set(this, cache);
	}
	const cached = cache.get(endpoint);
	if (cached !== undefined) {
		return cached;
	}

	let response;
	try {
		response = await microsoftApiRequest.call(this, 'GET', endpoint, {}, { $select: 'id' });
	} catch (error) {
		// Attribute a failed lookup to the Site field — the transport's generic
		// 404 mapping would otherwise blame the operation's resource (the list).
		if (error instanceof NodeApiError && error.httpCode === '404') {
			throw new NodeOperationError(this.getNode(), 'Site not found', {
				description:
					"Check the value in the 'Site' parameter — the URL must point to an existing SharePoint site.",
			});
		}
		throw error;
	}

	const siteId = String(response.id);
	cache.set(endpoint, siteId);
	return siteId;
}
