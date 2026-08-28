import type {
	IDataObject,
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
	// Identifiers like "ABC-123" live in `number`+`team.key`, not in the title.
	const identifierMatch = filter?.match(/^([A-Za-z]+)-(\d+)$/);
	const issueFilter = filter
		? identifierMatch
			? {
					and: [
						{ number: { eq: Number(identifierMatch[2]) } },
						{ team: { key: { eqIgnoreCase: identifierMatch[1] } } },
					],
				}
			: { title: { containsIgnoreCase: filter } }
		: undefined;

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
			filter: issueFilter,
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

/**
 * Search over a connection whose records aren't matched server-side — either the label
 * isn't `name` (documents use `title`) or the connection's filter input isn't part of
 * the API surface this node relies on elsewhere. Filters the fetched page locally.
 */
async function searchLocally(
	ctx: ILoadOptionsFunctions,
	entity: string,
	fields: string,
	toItem: (node: IDataObject) => INodeListSearchItems,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const body = {
		query: `query Search($first: Int, $after: String) {
			${entity}(first: $first, after: $after) {
				nodes {
					${fields}
				}
				pageInfo {
					hasNextPage
					endCursor
				}
			}
		}`,
		variables: { first: 250, after: paginationToken ?? null },
	};

	const response = (await linearApiRequest.call(ctx, body)) as unknown as {
		data: Record<
			string,
			{ nodes: IDataObject[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } }
		>;
	};
	const connection = response.data[entity];

	const search = filter?.toLowerCase();
	const results = connection.nodes
		.map(toItem)
		.filter((item) => !search || item.name.toLowerCase().includes(search));

	return {
		results,
		paginationToken: connection.pageInfo.hasNextPage
			? (connection.pageInfo.endCursor ?? undefined)
			: undefined,
	};
}

export async function getTeams(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	return await searchByName(this, 'teams', 'TeamFilter', filter, paginationToken);
}

export async function getUsers(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	return await searchByName(this, 'users', 'UserFilter', filter, paginationToken);
}

export async function getStates(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	return await searchByName(this, 'workflowStates', 'WorkflowStateFilter', filter, paginationToken);
}

export async function getLabels(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	return await searchByName(this, 'issueLabels', 'IssueLabelFilter', filter, paginationToken);
}

export async function getCycles(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	// A cycle's name is optional, so fall back to its number for the list label
	return await searchLocally(
		this,
		'cycles',
		'id name number team { key }',
		(node) => {
			const team = (node.team as IDataObject | undefined)?.key;
			const label = (node.name as string) || `Cycle ${node.number as number}`;
			return { name: team ? `${team as string} — ${label}` : label, value: node.id as string };
		},
		filter,
		paginationToken,
	);
}

export async function getDocuments(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	return await searchLocally(
		this,
		'documents',
		'id title',
		(node) => ({ name: node.title as string, value: node.id as string }),
		filter,
		paginationToken,
	);
}

export async function getReleases(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	return await searchLocally(
		this,
		'releases',
		'id name version',
		(node) => {
			const version = node.version as string | undefined;
			return {
				name: version ? `${node.name as string} (${version})` : (node.name as string),
				value: node.id as string,
			};
		},
		filter,
		paginationToken,
	);
}

export async function getViews(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	return await searchLocally(
		this,
		'customViews',
		'id name',
		(node) => ({ name: node.name as string, value: node.id as string }),
		filter,
		paginationToken,
	);
}
