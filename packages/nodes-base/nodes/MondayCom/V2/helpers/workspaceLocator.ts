import type { ILoadOptionsFunctions, INodeListSearchResult, INodeProperties } from 'n8n-workflow';

import { SEARCH_MAX_LIMIT } from './accountSearch';
import { MondayGraphQLClient } from '../transport/MondayGraphQLClient';

/**
 * Shared Workspace selector, modeled on boardLocator.ts. Two modes —
 * From List (searchable, paginated) and By ID. The list mode is hybrid:
 * no filter → paged workspaces enumeration (browse); filter typed → one
 * cross-entity search request (search.workspaces), which matches
 * server-side across the whole account, so workspaces beyond the loaded
 * window are still findable on big accounts.
 *
 * NOTE: the account's Main workspace is never returned by the workspaces
 * query — operations that support it treat an empty selection as Main
 * (see folders.ts). That convention is unchanged by this locator.
 */
export const workspaceResourceLocator: INodeProperties = {
	displayName: 'Workspace',
	name: 'workspaceId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	description: 'The workspace to operate on',
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'searchWorkspaces',
				searchable: true,
			},
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. 1234567',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '[0-9]+',
						errorMessage: 'The workspace ID must be a number',
					},
				},
			],
		},
	],
};

/** The workspaces query serves at most 100 rows per page. */
const WORKSPACES_PAGE_SIZE = 100;

interface WorkspaceRow {
	id: string;
	name: string;
}

/** A search.workspaces result row: indexed snapshot + optional live entity. */
interface WorkspaceSearchApiResult {
	id: string;
	indexed_data?: { name?: string | null } | null;
	live_data?: WorkspaceRow | null;
}

/**
 * Search path: one search.workspaces request, relevance-ordered,
 * hard-capped at 20 results with no pagination (per the search API
 * reference). Rows with null live_data (deleted, inaccessible, or index
 * lag per the reference) are kept on their indexed_data rather than
 * dropped — the workspace may well be selectable.
 */
async function searchWorkspacesViaSearchApi(
	client: MondayGraphQLClient,
	query: string,
): Promise<INodeListSearchResult> {
	const data = await client.execute(
		`query ($q: String!, $limit: Int) {
			search {
				workspaces(query: $q, limit: $limit) {
					results {
						id
						indexed_data { name }
						live_data { id name }
					}
				}
			}
		}`,
		0,
		{ q: query, limit: SEARCH_MAX_LIMIT },
	);

	const container = (
		data.search as { workspaces?: { results?: WorkspaceSearchApiResult[] } } | undefined
	)?.workspaces;

	const results = (container?.results ?? []).map((result) => ({
		name: result.live_data?.name ?? result.indexed_data?.name ?? String(result.id),
		value: String(result.id),
	}));

	// No paginationToken: the search API returns top-N only.
	return { results };
}

/**
 * listSearch method for the From List mode — hybrid:
 * - No filter → browse mode: pages through the workspaces query, 100 per
 *   request; n8n asks for the next page via paginationToken as the user
 *   scrolls.
 * - Filter typed → server-side search across the whole account via
 *   search.workspaces (searchWorkspacesViaSearchApi above).
 */
export async function searchWorkspaces(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const client = new MondayGraphQLClient(this);

	const query = filter?.trim();
	if (query) {
		return await searchWorkspacesViaSearchApi(client, query);
	}

	const page = paginationToken ? Number.parseInt(paginationToken, 10) : 1;

	const data = await client.execute(
		'query ($limit: Int!, $page: Int!) { workspaces(limit: $limit, page: $page) { id name } }',
		0,
		{ limit: WORKSPACES_PAGE_SIZE, page },
	);

	const workspaces = (data.workspaces ?? []) as WorkspaceRow[];

	return {
		results: workspaces.map((workspace) => ({
			name: workspace.name,
			value: String(workspace.id),
		})),
		// A full page means there may be more workspaces to fetch.
		paginationToken: workspaces.length === WORKSPACES_PAGE_SIZE ? String(page + 1) : undefined,
	};
}

/**
 * Unwraps a workspace resourceLocator value read from INSIDE a collection.
 * getNodeParameter's extractValue option only applies when the locator is
 * read as the whole parameter — reads of a parent collection hand back the
 * raw { mode, value } object, which every execute-time consumer funnels
 * through here. Plain strings (expression-mode values, unset options) pass
 * through unchanged; null/undefined become ''.
 */
export function extractWorkspaceId(value: unknown): string {
	if (value !== null && typeof value === 'object' && 'value' in (value as object)) {
		const inner = (value as { value?: unknown }).value;
		return inner === null || inner === undefined ? '' : String(inner);
	}
	return value === null || value === undefined ? '' : String(value);
}
