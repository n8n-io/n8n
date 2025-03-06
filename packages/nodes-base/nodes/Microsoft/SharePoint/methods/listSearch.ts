import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
	INodeParameterResourceLocator,
} from 'n8n-workflow';

import { microsoftSharePointApiRequest } from '../GenericFunctions';

export async function getItems(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const site = this.getNodeParameter('site') as INodeParameterResourceLocator;
	const list = this.getNodeParameter('list') as INodeParameterResourceLocator;

	let response: any;
	if (paginationToken) {
		response = await microsoftSharePointApiRequest.call(
			this,
			'GET',
			`/sites/${site.value}/lists/${list.value}/items`,
			{},
			undefined,
			undefined,
			paginationToken,
		);
	} else {
		const qs: IDataObject = {
			$expand: 'fields(select=Title)',
			$select: 'id,fields',
		};
		if (filter) {
			qs.$filter = `fields/Title eq ${filter}`;
		}
		response = await microsoftSharePointApiRequest.call(
			this,
			'GET',
			`/sites/${site.value}/lists/${list.value}/items`,
			{},
			qs,
		);
	}

	const items: Array<{
		id: string;
		fields: {
			Title: string;
		};
	}> = response.value;

	const results: INodeListSearchItems[] = items
		.map((g) => ({
			name: g.fields.Title ?? g.id,
			value: g.id,
		}))
		.sort((a, b) =>
			a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }),
		);

	return { results, paginationToken: response['@odata.nextLink'] };
}

export async function getLists(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const site = this.getNodeParameter('site') as INodeParameterResourceLocator;

	let response: any;
	if (paginationToken) {
		response = await microsoftSharePointApiRequest.call(
			this,
			'GET',
			`/sites/${site.value}/lists`,
			{},
			undefined,
			undefined,
			paginationToken,
		);
	} else {
		const qs: IDataObject = {
			$select: 'id,name',
		};
		if (filter) {
			qs.$search = filter;
		}
		response = await microsoftSharePointApiRequest.call(
			this,
			'GET',
			`/sites/${site.value}/lists`,
			{},
			qs,
		);
	}

	const lists: Array<{
		id: string;
		name: string;
	}> = response.value;

	const results: INodeListSearchItems[] = lists
		.map((g) => ({
			name: g.name,
			value: g.id,
		}))
		.sort((a, b) =>
			a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }),
		);

	return { results, paginationToken: response['@odata.nextLink'] };
}

export async function getSites(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	let response: any;
	if (paginationToken) {
		response = await microsoftSharePointApiRequest.call(
			this,
			'GET',
			'/sites',
			{},
			undefined,
			undefined,
			paginationToken,
		);
	} else {
		const qs: IDataObject = {
			$select: 'id,name',
		};
		if (filter) {
			qs.$search = filter;
		}
		response = await microsoftSharePointApiRequest.call(this, 'GET', '/sites', {}, qs);
	}

	const sites: Array<{
		id: string;
		name: string;
	}> = response.value;

	const results: INodeListSearchItems[] = sites
		.map((g) => ({
			name: g.name,
			value: g.id,
		}))
		.sort((a, b) =>
			a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }),
		);

	return { results, paginationToken: response['@odata.nextLink'] };
}
