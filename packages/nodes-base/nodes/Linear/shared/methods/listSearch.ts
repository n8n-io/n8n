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

interface ListSearchResponse {
	data: {
		initiatives: {
			nodes: NamedNode[];
			pageInfo: { hasNextPage: boolean; endCursor: string | null };
		};
	};
}

export async function getInitiatives(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const body = {
		query: `query Initiatives($first: Int, $after: String, $filter: InitiativeFilter) {
			initiatives(first: $first, after: $after, filter: $filter) {
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
			// Server-side search so large workspaces stay usable
			filter: filter ? { name: { containsIgnoreCase: filter } } : undefined,
		},
	};

	const response = (await linearApiRequest.call(this, body)) as unknown as ListSearchResponse;
	const { nodes, pageInfo } = response.data.initiatives;

	const results: INodeListSearchItems[] = nodes.map((node) => ({
		name: node.name,
		value: node.id,
	}));

	return {
		results,
		paginationToken: pageInfo.hasNextPage ? (pageInfo.endCursor ?? undefined) : undefined,
	};
}
