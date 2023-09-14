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

export async function getUsers(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const page = paginationToken ? +paginationToken : 1;
	const per_page = 100;
	const responseData: UserSearchResponse = await githubApiRequest.call(
		this,
		'GET',
		'/search/users',
		{},
		{ q: filter, page, per_page },
	);

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
