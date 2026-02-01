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

type UserSearchResponse = {
	items: UserSearchItem[];
	total_count: number;
};

type RepositorySearchResponse = {
	items: RepositorySearchItem[];
	total_count: number;
};

type RefItem = {
	ref: string;
};

export async function getUsers(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const page = paginationToken ? +paginationToken : 1;
	const per_page = 100;

	let responseData: UserSearchResponse = {
		items: [],
		total_count: 0,
	};

	try {
		responseData = await githubApiRequest.call(
			this,
			'GET',
			'/search/users',
			{},
			{ q: filter, page, per_page },
		);
	} catch {
		// will fail if the owner does not have any users
	}

	const results: INodeListSearchItems[] = responseData.items.map((item: UserSearchItem) => ({
		name: item.login,
		value: item.login,
		url: item.html_url,
	}));

	const nextPaginationToken = page * per_page < responseData.total_count ? page + 1 : undefined;
	return { results, paginationToken: nextPaginationToken };
}

export async function getRepositories(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const owner = this.getCurrentNodeParameter('owner', { extractValue: true });
	const page = paginationToken ? +paginationToken : 1;
	const per_page = 100;
	const q = `${filter ?? ''} user:${owner} fork:true`;
	let responseData: RepositorySearchResponse = {
		items: [],
		total_count: 0,
	};

	try {
		responseData = await githubApiRequest.call(
			this,
			'GET',
			'/search/repositories',
			{},
			{ q, page, per_page },
		);
	} catch {
		// will fail if the owner does not have any repositories
	}

	const results: INodeListSearchItems[] = responseData.items.map((item: RepositorySearchItem) => ({
		name: item.name,
		value: item.name,
		url: item.html_url,
	}));

	const nextPaginationToken = page * per_page < responseData.total_count ? page + 1 : undefined;
	return { results, paginationToken: nextPaginationToken };
}

export async function getWorkflows(
	this: ILoadOptionsFunctions,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const owner = this.getCurrentNodeParameter('owner', { extractValue: true });
	const repository = this.getCurrentNodeParameter('repository', { extractValue: true });
	const page = paginationToken ? +paginationToken : 1;
	const per_page = 100;
	const endpoint = `/repos/${owner}/${repository}/actions/workflows`;
	let responseData: { workflows: Array<{ id: string; name: string }>; total_count: number } = {
		workflows: [],
		total_count: 0,
	};

	try {
		responseData = await githubApiRequest.call(this, 'GET', endpoint, {}, { page, per_page });
	} catch {
		// will fail if the repository does not have any workflows
	}

	const results: INodeListSearchItems[] = responseData.workflows.map((workflow) => ({
		name: workflow.name,
		value: workflow.id,
	}));

	const nextPaginationToken = page * per_page < responseData.total_count ? page + 1 : undefined;
	return { results, paginationToken: nextPaginationToken };
}

export async function getRefs(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const owner = this.getCurrentNodeParameter('owner', { extractValue: true });
	const repository = this.getCurrentNodeParameter('repository', { extractValue: true });
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
	const nextPaginationToken = responseData.length === per_page ? page + 1 : undefined;
	return { results: refs, paginationToken: nextPaginationToken };
}
