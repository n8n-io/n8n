import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import { SERVICE_PRINCIPAL_AUTH } from '../helpers/constants';
import { resolveSiteId } from '../helpers/utils';
import { getExcelSharePointCredentialType, microsoftApiRequest } from '../transport';

type GraphCollectionReply<T> = {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	'@odata.nextLink'?: string;
	value?: T[];
};

/**
 * Searches sites by name. Graph quirks: the parameter is literally `search`
 * (not `$search`), and a site's name lives in `displayName` (no `title`).
 * Next-page links are requested exactly as returned — never rebuilt.
 */
export async function searchSites(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	type Site = { id?: string; displayName?: string; webUrl?: string };
	let response: GraphCollectionReply<Site>;
	try {
		response = paginationToken
			? await microsoftApiRequest.call(this, 'GET', '', {}, {}, paginationToken)
			: await microsoftApiRequest.call(
					this,
					'GET',
					'/v1.0/sites',
					{},
					{
						search: filter ?? '*',
						$select: 'id,displayName,webUrl',
					},
				);
	} catch (error) {
		// An app with only per-site permissions can't list what it can't see —
		// point at the "By URL"/"By ID" modes. Delegated refusals keep the
		// transport's message, which already names the missing permission.
		if (
			error instanceof NodeApiError &&
			error.httpCode === '403' &&
			getExcelSharePointCredentialType.call(this) === SERVICE_PRINCIPAL_AUTH
		) {
			throw new NodeOperationError(this.getNode(), 'This app sign-in cannot search sites', {
				description:
					"An app with only per-site permissions can't list sites it hasn't been granted. Choose the site by pasting its address instead — that still works.",
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

/** Lists the chosen site's document libraries — new ground, no precedent in this node. */
export async function searchLibraries(
	this: ILoadOptionsFunctions,
	_filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	// Load-options calls have no item index; 0 is a no-op fallback position here
	// (mirrors getExcelSharePointCredentialType's use of the same 2-arg form).
	const siteId = await resolveSiteId.call(this, 0);

	type Drive = { id?: string; name?: string; webUrl?: string };
	const response: GraphCollectionReply<Drive> = paginationToken
		? await microsoftApiRequest.call(this, 'GET', '', {}, {}, paginationToken)
		: await microsoftApiRequest.call(
				this,
				'GET',
				`/v1.0/sites/${encodeURIComponent(siteId)}/drives`,
				{},
				{ $select: 'id,name,webUrl' },
			);

	const results = (response.value ?? [])
		.filter((drive) => drive.id)
		.map((drive) => ({
			name: drive.name ?? String(drive.id),
			value: String(drive.id),
			url: drive.webUrl,
		}));

	return { results, paginationToken: response['@odata.nextLink'] };
}
