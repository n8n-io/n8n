import type { INode, INodeParameterResourceLocator } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import type { AuthContext } from './interfaces';
import { microsoftApiRequest } from '../transport';

/**
 * Guards a user-supplied value destined for a URL path segment: rejects empty
 * values and dots-only values ('..' survives encodeURIComponent and would
 * retarget the request path). Returns the trimmed value.
 */
export function validatePathSegment(node: INode, label: string, value: string): string {
	const trimmed = String(value ?? '').trim();
	if (trimmed === '') {
		throw new NodeOperationError(node, `The '${label}' parameter is empty`, {
			description: 'Set the value and try again.',
		});
	}
	if (/^\.+$/.test(trimmed)) {
		throw new NodeOperationError(node, `The '${label}' value is not valid`, {
			description: 'A value cannot consist only of dots.',
		});
	}
	return trimmed;
}

/**
 * Resolves the workbook fields to the Graph root every request hangs off:
 * `/v1.0/sites/{site}/drives/{drive}/items/{item}`. A pasted address costs one
 * lookup (Graph's sharing-URL exchange); IDs are used as given.
 *
 * `workbookRootCache`/`siteIdCache` are the caller's per-execution caches (one
 * lookup per distinct pasted address, not one per item) — the caller hoists
 * them once above its item loop and passes the same instances every call.
 *
 * `itemIndex` defaults to 0 so load-options contexts (list-search methods for
 * the sheet/table dropdowns), which have no item index and no loop to
 * amortize a cache across, can call this too without passing any of the
 * three — `AuthContext.getNodeParameter`'s 2nd arg is itemIndex in execute
 * and the fallback in load-options; 0 is a valid, harmless value either way.
 */
export async function resolveWorkbookRoot(
	this: AuthContext,
	itemIndex = 0,
	workbookRootCache: Map<string, string> = new Map(),
	siteIdCache: Map<string, string> = new Map(),
): Promise<string> {
	const workbook = this.getNodeParameter('workbook', itemIndex) as INodeParameterResourceLocator;
	const workbookValue = String(workbook.value ?? '').trim();

	if (workbook.mode === 'url') {
		if (workbookValue === '') {
			throw new NodeOperationError(this.getNode(), "The 'Workbook' parameter is empty", {
				description: "Paste the workbook's address, or switch to choosing it by ID.",
			});
		}

		const cached = workbookRootCache.get(workbookValue);
		if (cached !== undefined) {
			return cached;
		}

		// Graph's sharing-URL exchange: 'u!' + unpadded URL-safe base64 of the address
		const shareId = `u!${Buffer.from(workbookValue)
			.toString('base64')
			.replace(/=+$/, '')
			.replace(/\+/g, '-')
			.replace(/\//g, '_')}`;
		const driveItem = await microsoftApiRequest.call(
			this,
			'GET',
			`/v1.0/shares/${shareId}/driveItem`,
			{},
			{ $select: 'id,parentReference' },
		);
		const itemId = String(driveItem.id ?? '');
		const parent = driveItem.parentReference as { siteId?: string; driveId?: string } | undefined;
		if (itemId === '' || !parent?.siteId || !parent.driveId) {
			throw new NodeOperationError(this.getNode(), 'The workbook address could not be resolved', {
				description: 'Check the pasted address points at a workbook in a SharePoint library.',
			});
		}

		const root = `/v1.0/sites/${encodeURIComponent(parent.siteId)}/drives/${encodeURIComponent(parent.driveId)}/items/${encodeURIComponent(itemId)}`;
		workbookRootCache.set(workbookValue, root);
		return root;
	}

	const node = this.getNode();
	const siteId = await resolveSiteId.call(this, itemIndex, siteIdCache);
	const driveId = validatePathSegment(
		node,
		'Library',
		String(
			(this.getNodeParameter('library', itemIndex) as INodeParameterResourceLocator).value ?? '',
		),
	);
	const itemId = validatePathSegment(node, 'Workbook', workbookValue);

	return `/v1.0/sites/${encodeURIComponent(siteId)}/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}`;
}

/**
 * Resolves the `site` resource locator to a Graph site ID — the one place
 * this happens, reused by workbook-root resolution and the library dropdown.
 * IDs (from "By ID" or a "From List" pick) are used as given; a pasted
 * address costs one lookup via Graph's `{hostname}:{site-path}` addressing.
 *
 * `cache` is the caller's per-execution cache; a load-options call (the
 * library dropdown) has no loop to amortize, so it just omits one.
 */
export async function resolveSiteId(
	this: AuthContext,
	itemIndex: number,
	cache: Map<string, string> = new Map(),
): Promise<string> {
	const site = this.getNodeParameter('site', itemIndex) as INodeParameterResourceLocator;
	const value = String(site.value ?? '').trim();

	if (site.mode !== 'url') {
		return validatePathSegment(this.getNode(), 'Site', value);
	}

	if (value === '') {
		throw new NodeOperationError(this.getNode(), "The 'Site' parameter is empty", {
			description: "Paste the site's address, or switch to choosing it by ID or from the list.",
		});
	}

	let parsed: URL;
	try {
		parsed = new URL(value);
	} catch {
		throw new NodeOperationError(this.getNode(), 'The site address is not valid', {
			description: 'Paste the full site address, e.g. https://contoso.sharepoint.com/sites/mysite.',
		});
	}
	const path = parsed.pathname.replace(/\/+$/, '');
	const endpoint =
		path === '' ? `/v1.0/sites/${parsed.hostname}` : `/v1.0/sites/${parsed.hostname}:${path}`;

	const cached = cache.get(endpoint);
	if (cached !== undefined) {
		return cached;
	}

	let response;
	try {
		response = await microsoftApiRequest.call(this, 'GET', endpoint, {}, { $select: 'id' });
	} catch (error) {
		// Attribute a failed lookup to the Site field — the transport's generic
		// 404 mapping would otherwise blame the operation's resource (the workbook).
		if (error instanceof NodeApiError && error.httpCode === '404') {
			throw new NodeOperationError(this.getNode(), 'Site not found', {
				description:
					"Check the value in the 'Site' parameter — the address must point to an existing SharePoint site.",
			});
		}
		throw error;
	}

	const siteId = validatePathSegment(this.getNode(), 'Site', String(response.id ?? ''));
	cache.set(endpoint, siteId);
	return siteId;
}
