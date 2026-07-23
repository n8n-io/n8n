import type {
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';

import { githubApiRequest } from './GenericFunctions';

type OwnerSearchItem = {
	login: string;
	html_url: string;
};

type RepositorySearchItem = {
	name: string;
	html_url: string;
};

type UserSearchResponse = {
	items: OwnerSearchItem[];
	total_count: number;
};

type RepositorySearchResponse = {
	items: RepositorySearchItem[];
	total_count: number;
};

type WorkflowSearchResponse = {
	workflows: Array<{ id: string; name: string }>;
	total_count: number;
};

type RefItem = {
	ref: string;
};

const toResourceLocatorItems = (items: OwnerSearchItem[]): INodeListSearchItems[] =>
	items.map((item) => ({
		name: item.login,
		value: item.login,
		url: item.html_url,
	}));

const getCurrentStringParameter = (thisContext: ILoadOptionsFunctions, parameter: string) =>
	String(thisContext.getCurrentNodeParameter(parameter, { extractValue: true }) ?? '').trim();

export async function getUsers(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const page = paginationToken ? +paginationToken : 1;
	const per_page = 100;
	const query = filter?.trim();

	if (!query) {
		const authenticatedUser: OwnerSearchItem = await githubApiRequest.call(
			this,
			'GET',
			'/user',
			{},
		);
		const organizations: OwnerSearchItem[] = await githubApiRequest.call(
			this,
			'GET',
			'/user/orgs',
			{},
			{ page, per_page },
		);
		const owners = page === 1 ? [authenticatedUser, ...organizations] : organizations;
		const nextPaginationToken = organizations.length === per_page ? String(page + 1) : undefined;

		return { results: toResourceLocatorItems(owners), paginationToken: nextPaginationToken };
	}

	const responseData: UserSearchResponse = await githubApiRequest.call(
		this,
		'GET',
		'/search/users',
		{},
		{ q: query, page, per_page },
	);

	const nextPaginationToken =
		page * per_page < responseData.total_count ? String(page + 1) : undefined;
	return {
		results: toResourceLocatorItems(responseData.items),
		paginationToken: nextPaginationToken,
	};
}

export async function getRepositories(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const owner = getCurrentStringParameter(this, 'owner');
	if (!owner) return { results: [] };

	const page = paginationToken ? +paginationToken : 1;
	const per_page = 100;
	const q = [filter?.trim(), `user:${owner}`, 'fork:true'].filter(Boolean).join(' ');
	const responseData: RepositorySearchResponse = await githubApiRequest.call(
		this,
		'GET',
		'/search/repositories',
		{},
		{ q, page, per_page },
	);

	const results: INodeListSearchItems[] = responseData.items.map((item: RepositorySearchItem) => ({
		name: item.name,
		value: item.name,
		url: item.html_url,
	}));

	const nextPaginationToken =
		page * per_page < responseData.total_count ? String(page + 1) : undefined;
	return { results, paginationToken: nextPaginationToken };
}

export async function getWorkflows(
	this: ILoadOptionsFunctions,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const owner = getCurrentStringParameter(this, 'owner');
	const repository = getCurrentStringParameter(this, 'repository');
	if (!owner || !repository) return { results: [] };

	const page = paginationToken ? +paginationToken : 1;
	const per_page = 100;
	const endpoint = `/repos/${owner}/${repository}/actions/workflows`;
	const responseData: WorkflowSearchResponse = await githubApiRequest.call(
		this,
		'GET',
		endpoint,
		{},
		{ page, per_page },
	);

	const results: INodeListSearchItems[] = responseData.workflows.map((workflow) => ({
		name: workflow.name,
		value: workflow.id,
	}));

	const nextPaginationToken =
		page * per_page < responseData.total_count ? String(page + 1) : undefined;
	return { results, paginationToken: nextPaginationToken };
}

export async function getRefs(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const owner = getCurrentStringParameter(this, 'owner');
	const repository = getCurrentStringParameter(this, 'repository');
	if (!owner || !repository) return { results: [] };

	const page = paginationToken ? +paginationToken : 1;
	const per_page = 100;

	const responseData: RefItem[] = await githubApiRequest.call(
		this,
		'GET',
		`/repos/${owner}/${repository}/git/refs`,
		{},
		{ page, per_page },
	);

	const refs: INodeListSearchItems[] = [];

	for (const ref of responseData) {
		const refPath = ref.ref.split('/');
		const refType = refPath[1];
		const refName = refPath.slice(2).join('/');

		let description = '';
		if (refType === 'heads') {
			description = `Branch: ${refName}`;
		} else if (refType === 'tags') {
			description = `Tag: ${refName}`;
		} else {
			description = `${refType}: ${refName}`;
		}

		refs.push({
			name: refName,
			value: refName,
			description,
		});
	}

	if (filter) {
		const filteredRefs = refs.filter((ref) =>
			ref.name.toLowerCase().includes(filter.toLowerCase()),
		);
		return { results: filteredRefs };
	}
	const nextPaginationToken = responseData.length === per_page ? String(page + 1) : undefined;
	return { results: refs, paginationToken: nextPaginationToken };
}
