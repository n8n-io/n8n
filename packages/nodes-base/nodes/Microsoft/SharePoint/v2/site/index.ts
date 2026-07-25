import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeListSearchResult,
	INodeParameterResourceLocator,
	INodeProperties,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import { type GraphSearchReply } from '../helpers/utils';
import {
	getSharePointCredentialType,
	microsoftApiRequest,
	SERVICE_PRINCIPAL_AUTH,
} from '../transport';

// The whole site-selection piece lives here — the field, the search behind
// it, and the URL resolution — so later actions and the future trigger plug
// it in without their own copies.

export const siteRLC: INodeProperties = {
	displayName: 'Site',
	name: 'site',
	type: 'resourceLocator',
	required: true,
	default: { mode: 'list', value: '' },
	description: 'The SharePoint site to operate on',
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'getSites',
				searchable: true,
			},
		},
		{
			displayName: 'By URL',
			name: 'url',
			type: 'string',
			placeholder: 'e.g. https://contoso.sharepoint.com/sites/mysite',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '^https://.+',
						errorMessage: 'The URL must start with https://',
					},
				},
			],
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. contoso.sharepoint.com,5a58bb09-…,9f0d…',
		},
	],
};

type SiteSearchReply = GraphSearchReply<{ id?: string; displayName?: string; webUrl?: string }>;

/**
 * Searches sites by name. Graph quirks: the parameter is literally `search`
 * (not `$search`), and a site's name lives in `displayName` (no `title`).
 * Next-page links are requested exactly as returned — never rebuilt.
 */
export async function getSites(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	let response: SiteSearchReply;
	try {
		response = paginationToken
			? ((await microsoftApiRequest.call(
					this,
					'GET',
					'',
					{},
					{},
					paginationToken,
				)) as SiteSearchReply)
			: ((await microsoftApiRequest.call(
					this,
					'GET',
					'/v1.0/sites',
					{},
					{
						search: filter ?? '*',
						$select: 'id,displayName,webUrl',
					},
				)) as SiteSearchReply);
	} catch (error) {
		// An app with only per-site permissions can't list what it can't see —
		// point at the URL mode. Delegated refusals keep the transport's message,
		// which names the missing permission (URL paste would hit the same 403).
		if (
			error instanceof NodeApiError &&
			error.httpCode === '403' &&
			getSharePointCredentialType.call(this) === SERVICE_PRINCIPAL_AUTH
		) {
			throw new NodeOperationError(this.getNode(), 'This app registration cannot search sites', {
				description:
					"An app registration with only per-site permissions can't list sites. Choose the site by pasting its URL instead — that still works — or grant the app the Sites.Read.All application permission to enable search.",
			});
		}
		throw error;
	}

	// Kept in the API's order: the editor concatenates pages, so a per-page
	// sort would reset at every page boundary and read as misordered
	const results = (response.value ?? [])
		.filter((site) => site.id)
		.map((site) => ({
			name: site.displayName ?? String(site.id),
			value: String(site.id),
			url: site.webUrl,
		}));

	return { results, paginationToken: response['@odata.nextLink'] };
}

/**
 * Resolves the `site` field to a Graph site ID; URL mode costs one lookup.
 * Callers with a per-item loop pass `siteIdCache` (hoisted in the router) so
 * a multi-item run resolves each distinct URL once instead of per item —
 * without it the run doubles its Graph request volume and risks 429 throttling.
 * Load-options callers (the list-search dropdown) have no per-run cache to
 * hoist and pass none — each dropdown open is its own one-off lookup.
 */
export async function resolveSiteId(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	itemIndex: number,
	siteIdCache?: Map<string, string>,
): Promise<string> {
	const site = this.getNodeParameter('site', itemIndex) as INodeParameterResourceLocator;
	const value = String(site.value ?? '').trim();

	// Site-field validation lives here so every action (and the future trigger)
	// inherits it — an empty segment would change the request shape (/sites//…).
	if (value === '') {
		throw new NodeOperationError(this.getNode(), "The 'Site' parameter is empty", {
			description: 'Set the site ID or URL and try again.',
		});
	}
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
	// Re-encode each segment so a raw ':' can't escape the `{host}:{path}` shape;
	// decoding first keeps already-encoded segments from being encoded twice.
	const path = parsed.pathname
		.replace(/\/+$/, '')
		.split('/')
		.map((segment) => {
			try {
				segment = decodeURIComponent(segment);
			} catch {
				// Malformed escape sequence — encode the raw segment as-is
			}
			return encodeURIComponent(segment);
		})
		.join('/');
	const endpoint =
		path === '' ? `/v1.0/sites/${parsed.hostname}` : `/v1.0/sites/${parsed.hostname}:${path}`;

	const cached = siteIdCache?.get(endpoint);
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
	siteIdCache?.set(endpoint, siteId);
	return siteId;
}
