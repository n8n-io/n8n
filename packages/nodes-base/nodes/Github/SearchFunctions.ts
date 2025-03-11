import type {
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';

import { githubApiRequest } from './GenericFunctions';

type UserSearchItem = {
	login: string;
	html_url: string;
};

type RepositorySearchItem = {
	name: string;
	html_url: string;
};

// Helper function to extract the next page token from GitHub's Link header
function extractNextPageToken(linkHeader?: string): string | undefined {
	if (!linkHeader) return undefined;
	const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
	return match ? match[1] : undefined;
}

export async function getUsers(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const per_page = 100;
	const url = paginationToken ?? `/search/users?q=${filter}&page=1&per_page=${per_page}`;

	let nextPaginationToken: string | undefined = undefined;
	let users: UserSearchItem[] = [];

	try {
		const response = await githubApiRequest.call(this, 'GET', url, {}, {});
		users = response.items;
		nextPaginationToken = extractNextPageToken(response.headers?.link);
	} catch {
		// will fail if no users are found
	}

	const results: INodeListSearchItems[] = users.map((user) => ({
		name: user.login,
		value: user.login,
		url: user.html_url,
	}));

	return { results, paginationToken: nextPaginationToken };
}

export async function getRepositories(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const owner = this.getCurrentNodeParameter('owner', { extractValue: true });
	const per_page = 100;
	const q = `${filter ?? ''} user:${owner} fork:true`;
	const url = paginationToken || `/search/repositories?q=${q}&page=1&per_page=${per_page}`;

	let nextPaginationToken: string | undefined = undefined;
	let repositories: RepositorySearchItem[] = [];

	try {
		const response = await githubApiRequest.call(this, 'GET', url, {}, {});
		repositories = response.items;
		nextPaginationToken = extractNextPageToken(response.headers?.link);
	} catch {
		// will fail if the owner does not have any repositories
	}

	const results: INodeListSearchItems[] = repositories.map((repo) => ({
		name: repo.name,
		value: repo.name,
		url: repo.html_url,
	}));

	return { results, paginationToken: nextPaginationToken };
}

export async function getWorkflows(
	this: ILoadOptionsFunctions,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const owner = this.getCurrentNodeParameter('owner', { extractValue: true });
	const repository = this.getCurrentNodeParameter('repository', { extractValue: true });
	const per_page = 100;
	const endpoint = `/repos/${owner}/${repository}/actions/workflows`;
	const url = paginationToken ?? `${endpoint}?page=1&per_page=${per_page}`;

	let nextPaginationToken: string | undefined = undefined;
	const responseData: { workflows: Array<{ id: string; name: string }>; total_count: number } = {
		workflows: [],
		total_count: 0,
	};

	try {
		const response = await githubApiRequest.call(this, 'GET', url, {}, {});
		responseData.workflows = response.workflows;
		responseData.total_count = response.total_count;
		nextPaginationToken = extractNextPageToken(response.headers?.link);
	} catch {
		// will fail if the repository does not have any workflows
	}

	const results: INodeListSearchItems[] = responseData.workflows.map((workflow) => ({
		name: workflow.name,
		value: workflow.id,
	}));

	return { results, paginationToken: nextPaginationToken };
}

export async function getRefs(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const owner = this.getCurrentNodeParameter('owner', { extractValue: true });
	const repository = this.getCurrentNodeParameter('repository', { extractValue: true });
	const per_page = 100;

	let nextPaginationToken: string | undefined = undefined;
	const refs: INodeListSearchItems[] = [];

	try {
		// Fetch branches
		const branchesUrl =
			paginationToken ?? `/repos/${owner}/${repository}/branches?page=1&per_page=${per_page}`;
		const branchesResponse = await githubApiRequest.call(this, 'GET', branchesUrl, {}, {});
		for (const branch of branchesResponse) {
			refs.push({
				name: branch.name,
				value: branch.name,
				description: `Branch: ${branch.name}`,
			});
		}

		// Fetch tags
		const tagsUrl = `/repos/${owner}/${repository}/tags?page=1&per_page=${per_page}`;
		const tagsResponse = await githubApiRequest.call(this, 'GET', tagsUrl, {}, {});

		for (const tag of tagsResponse) {
			refs.push({
				name: tag.name,
				value: tag.name,
				description: `Tag: ${tag.name}`,
			});
		}

		nextPaginationToken = extractNextPageToken(
			branchesResponse.headers?.link || tagsResponse.headers?.link,
		);
	} catch {
		// will fail if the repository does not have any branches or tags
	}

	if (filter) {
		const filteredRefs = refs.filter((ref) =>
			ref.name.toLowerCase().includes(filter.toLowerCase()),
		);
		return { results: filteredRefs, paginationToken: nextPaginationToken };
	}
	return { results: refs, paginationToken: nextPaginationToken };
}
