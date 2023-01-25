import { ILoadOptionsFunctions, INodeListSearchItems, INodeListSearchResult } from 'n8n-workflow';
import { githubApiRequest } from './GenericFunctions';

type UserSearchItem = {
	login: string;
	html_url: string;
};

type RepositorySearchItem = {
	name: string;
	html_url: string;
};

export async function getUsers(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const page = paginationToken ? +paginationToken : 1;
	const per_page = 20;
	const responseData = await githubApiRequest.call(
		this,
		'GET',
		'/search/users',
		{},
		{
			q: filter,
			page,
			per_page,
		},
		{
			resolveWithFullResponse: true,
		},
	);

	const results: INodeListSearchItems[] = responseData.body.items.map((item: UserSearchItem) => ({
		name: item.login,
		value: item.login,
		url: item.html_url,
	}));

	const nextPaginationToken = page * per_page < responseData.body.total_count ? page + 1 : null;

	console.log({ paginationToken, page, nextPaginationToken, total: responseData.body.total_count });

	return { results, paginationToken: nextPaginationToken };
}

export async function getRepositories(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const page = paginationToken ? +paginationToken : 1;
	const per_page = 20;
	const owner = this.getCurrentNodeParameter('owner', { extractValue: true });
	console.log('get repositories');
	const responseData = await githubApiRequest.call(
		this,
		'GET',
		'/search/repositories',
		{},
		{
			q: `${filter} user:${owner}`,
			page,
			per_page,
		},
		{
			resolveWithFullResponse: true,
		},
	);

	const results: INodeListSearchItems[] = responseData.body.items.map(
		(item: RepositorySearchItem) => ({
			name: item.name,
			value: item.name,
			url: item.html_url,
		}),
	);

	const nextPaginationToken = page * per_page < responseData.body.total_count ? page + 1 : null;

	console.log({ paginationToken, page, nextPaginationToken, total: responseData.body.total_count });

	return { results, paginationToken: nextPaginationToken };
}
