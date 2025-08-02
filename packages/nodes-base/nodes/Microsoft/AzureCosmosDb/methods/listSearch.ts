import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchResult,
	INodeListSearchItems,
} from 'n8n-workflow';

import { HeaderConstants } from '../helpers/constants';
import { azureCosmosDbApiRequest } from '../transport';

function formatResults(items: IDataObject[], filter?: string): INodeListSearchItems[] {
	return items
		.map(({ id }) => ({
			name: String(id).replace(/ /g, ''),
			value: String(id),
		}))
		.filter(({ name }) => !filter || name.includes(filter))
		.sort((a, b) => a.name.localeCompare(b.name));
}

export async function searchContainers(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const headers = paginationToken ? { [HeaderConstants.X_MS_CONTINUATION]: paginationToken } : {};
	const responseData = (await azureCosmosDbApiRequest.call(
		this,
		'GET',
		'/colls',
		{},
		{},
		headers,
		true,
	)) as {
		body: IDataObject;
		headers: IDataObject;
	};

	const containers = responseData.body.DocumentCollections as IDataObject[];

	return {
		results: formatResults(containers, filter),
		paginationToken: responseData.headers[HeaderConstants.X_MS_CONTINUATION],
	};
}

export async function searchItems(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const container = this.getCurrentNodeParameter('container', {
		extractValue: true,
	}) as string;
	const headers = paginationToken ? { [HeaderConstants.X_MS_CONTINUATION]: paginationToken } : {};
	const responseData = (await azureCosmosDbApiRequest.call(
		this,
		'GET',
		`/colls/${container}/docs`,
		{},
		{},
		headers,
		true,
	)) as {
		body: IDataObject;
		headers: IDataObject;
	};

	const items = responseData.body.Documents as IDataObject[];

	return {
		results: formatResults(items, filter),
		paginationToken: responseData.headers[HeaderConstants.X_MS_CONTINUATION],
	};
}
