import type {
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';

import { linearApiRequest } from '../GenericFunctions';

interface NamedNode {
	id: string;
	name: string;
}

interface SearchResponse {
	data: Record<
		string,
		{ nodes: NamedNode[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } }
	>;
}

/**
 * Shared resource-locator search over a top-level Linear connection that supports
 * a `name` filter (Initiatives, Projects, etc.). Server-side filtering keeps large
 * workspaces usable.
 */
async function searchByName(
	ctx: ILoadOptionsFunctions,
	entity: string,
	filterType: string,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const body = {
		query: `query Search($first: Int, $after: String, $filter: ${filterType}) {
			${entity}(first: $first, after: $after, filter: $filter) {
				nodes {
					id
					name
				}
				pageInfo {
					hasNextPage
					endCursor
				}
			}
		}`,
		variables: {
			first: 50,
			after: paginationToken ?? null,
			filter: filter ? { name: { containsIgnoreCase: filter } } : undefined,
		},
	};

	const response = (await linearApiRequest.call(ctx, body)) as unknown as SearchResponse;
	const connection = response.data[entity];

	const results: INodeListSearchItems[] = connection.nodes.map((node) => ({
		name: node.name,
		value: node.id,
	}));

	return {
		results,
		paginationToken: connection.pageInfo.hasNextPage
			? (connection.pageInfo.endCursor ?? undefined)
			: undefined,
	};
}

export async function getInitiatives(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	return await searchByName(this, 'initiatives', 'InitiativeFilter', filter, paginationToken);
}

export async function getProjects(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	return await searchByName(this, 'projects', 'ProjectFilter', filter, paginationToken);
}

export async function getCustomers(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	return await searchByName(this, 'customers', 'CustomerFilter', filter, paginationToken);
}

/**
 * Issues use `title` (not `name`) and are surfaced with their identifier for context,
 * so they need a dedicated search rather than the shared name-based helper.
 */
export async function getIssues(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const body = {
		query: `query Issues($first: Int, $after: String, $filter: IssueFilter) {
			issues(first: $first, after: $after, filter: $filter) {
				nodes {
					id
					identifier
					title
				}
				pageInfo {
					hasNextPage
					endCursor
				}
			}
		}`,
		variables: {
			first: 50,
			after: paginationToken ?? null,
			filter: filter ? { title: { containsIgnoreCase: filter } } : undefined,
		},
	};

	const response = (await linearApiRequest.call(this, body)) as unknown as {
		data: {
			issues: {
				nodes: Array<{ id: string; identifier: string; title: string }>;
				pageInfo: { hasNextPage: boolean; endCursor: string | null };
			};
		};
	};
	const { nodes, pageInfo } = response.data.issues;

	const results: INodeListSearchItems[] = nodes.map((node) => ({
		name: `${node.identifier} — ${node.title}`,
		value: node.id,
	}));

	return {
		results,
		paginationToken: pageInfo.hasNextPage ? (pageInfo.endCursor ?? undefined) : undefined,
	};
}
