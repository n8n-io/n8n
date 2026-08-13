import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

import { getProjectFilesProxy } from './utils';

export async function fileSearch(
	this: ILoadOptionsFunctions,
	filterString?: string,
	prevPaginationToken?: string,
): Promise<INodeListSearchResult> {
	const proxy = await getProjectFilesProxy(this);

	const skip = prevPaginationToken === undefined ? 0 : parseInt(prevPaginationToken, 10);
	const take = 100;
	const filter = filterString === undefined ? {} : { filter: { name: filterString } };
	const result = await proxy.getManyAndCount({
		skip,
		take,
		sortBy: 'name:asc',
		...filter,
	});

	const results = result.data.map((file) => ({
		name: file.name,
		value: file.id,
		url: `/projects/${proxy.getProjectId()}/files/${file.id}`,
	}));

	const paginationToken = results.length === take ? `${skip + take}` : undefined;

	return {
		results,
		paginationToken,
	};
}
