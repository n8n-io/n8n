import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';

import type { IDriveItem, IList, IListItem, ISite } from '../helpers/interfaces';
import { microsoftSharePointApiRequest } from '../transport';

export async function getFiles(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const site = this.getNodeParameter('site', undefined, { extractValue: true }) as string;
	const folder = this.getNodeParameter('folder', undefined, { extractValue: true }) as string;

	let response: any;
	if (paginationToken) {
		response = await microsoftSharePointApiRequest.call(
			this,
			'GET',
			`/sites/${site}/drive/items/${folder}/children`,
			{},
			undefined,
			undefined,
			paginationToken,
		);
	} else {
		// File filter not supported
		// https://learn.microsoft.com/en-us/onedrive/developer/rest-api/concepts/filtering-results?view=odsp-graph-online#filterable-properties
		const qs: IDataObject = {
			$select: 'id,name,file',
		};
		if (filter) {
			qs.$filter = `name eq '${filter}'`;
		}
		response = await microsoftSharePointApiRequest.call(
			this,
			'GET',
			`/sites/${site}/drive/items/${folder}/children`,
			{},
			qs,
		);
	}

	const items: IDriveItem[] = response.value;

	const results: INodeListSearchItems[] = items
		.filter((x) => x.file)
		.map((g) => ({
			name: g.name,
			value: g.id,
		}))
		.sort((a, b) =>
			a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }),
		);

	return { results, paginationToken: response['@odata.nextLink'] };
}

export async function getFolders(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const site = this.getNodeParameter('site', undefined, { extractValue: true }) as string;

	let response: any;
	if (paginationToken) {
		response = await microsoftSharePointApiRequest.call(
			this,
			'GET',
			`/sites/${site}/drive/items`,
			{},
			undefined,
			undefined,
			paginationToken,
		);
	} else {
		const qs: IDataObject = {
			$select: 'id,name,folder',
			// Folder filter not supported, but filter is still required
			// https://learn.microsoft.com/en-us/onedrive/developer/rest-api/concepts/filtering-results?view=odsp-graph-online#filterable-properties
			$filter: 'folder ne null',
		};
		if (filter) {
			qs.$filter = `name eq '${filter}'`;
		}
		response = await microsoftSharePointApiRequest.call(
			this,
			'GET',
			`/sites/${site}/drive/items`,
			{},
			qs,
		);
	}

	const items: IDriveItem[] = response.value;

	const results: INodeListSearchItems[] = items
		.filter((x) => x.folder)
		.map((g) => ({
			name: g.name,
			value: g.id,
		}))
		.sort((a, b) =>
			a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }),
		);

	return { results, paginationToken: response['@odata.nextLink'] };
}

export async function getItems(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const site = this.getNodeParameter('site', undefined, { extractValue: true }) as string;
	const list = this.getNodeParameter('list', undefined, { extractValue: true }) as string;

	let response: any;
	if (paginationToken) {
		response = await microsoftSharePointApiRequest.call(
			this,
			'GET',
			`/sites/${site}/lists/${list}/items`,
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
			qs.$filter = `fields/Title eq '${filter}'`;
		}
		response = await microsoftSharePointApiRequest.call(
			this,
			'GET',
			`/sites/${site}/lists/${list}/items`,
			{},
			qs,
		);
	}

	const items: IListItem[] = response.value;

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
	const site = this.getNodeParameter('site', undefined, { extractValue: true }) as string;

	let response: any;
	if (paginationToken) {
		response = await microsoftSharePointApiRequest.call(
			this,
			'GET',
			`/sites/${site}/lists`,
			{},
			undefined,
			undefined,
			paginationToken,
		);
	} else {
		const qs: IDataObject = {
			$select: 'id,displayName',
		};
		if (filter) {
			qs.$filter = `displayName eq '${filter}'`;
		}
		response = await microsoftSharePointApiRequest.call(
			this,
			'GET',
			`/sites/${site}/lists`,
			{},
			qs,
		);
	}

	const lists: IList[] = response.value;

	const results: INodeListSearchItems[] = lists
		.map((g) => ({
			name: g.displayName,
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
			$select: 'id,title',
			$search: '*',
		};
		if (filter) {
			qs.$search = filter;
		}
		response = await microsoftSharePointApiRequest.call(this, 'GET', '/sites', {}, qs);
	}

	const sites: ISite[] = response.value;

	const results: INodeListSearchItems[] = sites
		.map((g) => ({
			name: g.title,
			value: g.id,
		}))
		.sort((a, b) =>
			a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }),
		);

	return { results, paginationToken: response['@odata.nextLink'] };
}
