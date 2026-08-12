import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

import { getProjectFileProxy } from './utils';

export async function fileSearch(
	this: ILoadOptionsFunctions,
	filterString?: string,
	prevPaginationToken?: string,
): Promise<INodeListSearchResult> {
	const proxy = await getProjectFileProxy(this, this.getNode());

	const skip = prevPaginationToken === undefined ? 0 : parseInt(prevPaginationToken, 10);
	const take = 100;

	const { data } = await proxy.listFiles({ search: filterString, take, skip });

	return {
		results: data.map((file) => ({ name: file.name, value: file.id })),
		// A full page means there may be more; a short page is the last one.
		paginationToken: data.length === take ? `${skip + take}` : undefined,
	};
}
