import type { IDataObject, ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';
import { microsoftApiRequest } from '../transport';

async function search(
	this: ILoadOptionsFunctions,
	resource: string,
	nameProperty: string,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	let response: IDataObject = {};

	if (paginationToken) {
		response = await microsoftApiRequest.call(
			this,
			'GET',
			'',
			undefined,
			undefined,
			paginationToken, // paginationToken contains the full URL
		);
	} else {
		const qs: IDataObject = {
			$select: `id,${nameProperty}`,
			$top: 100,
		};

		if (filter) {
			const filterValue = encodeURI(filter);
			// qs.$filter = `startsWith(${nameProperty}, '${filterValue}')`;
			qs.$search = `"${filterValue}"`;
		}

		response = await microsoftApiRequest.call(this, 'GET', resource, undefined, qs);
	}

	return {
		results: (response.value as IDataObject[]).map((entry: IDataObject) => {
			return {
				name: entry[nameProperty] as string,
				value: entry.id as string,
			};
		}),
		paginationToken: response['@odata.nextLink'],
	};
}

export async function searchContacts(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	return search.call(this, '/contacts', 'displayName', filter, paginationToken);
}

export async function searchCalendars(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	return search.call(this, '/calendars', 'name', filter, paginationToken);
}

export async function searchDrafts(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	let response: IDataObject = {};

	if (paginationToken) {
		response = await microsoftApiRequest.call(
			this,
			'GET',
			'',
			undefined,
			undefined,
			paginationToken, // paginationToken contains the full URL
		);
	} else {
		const qs: IDataObject = {
			$select: 'id,subject,bodyPreview',
			$top: 100,
			$filter: 'isDraft eq true',
		};

		// if (filter) {
		// 	const filterValue = encodeURI(filter);
		// 	qs.$search = `"${filterValue}"`;
		// }

		response = await microsoftApiRequest.call(this, 'GET', '/messages', undefined, qs);
	}

	return {
		results: (response.value as IDataObject[]).map((entry: IDataObject) => {
			return {
				name: (entry.subject || entry.bodyPreview) as string,
				value: entry.id as string,
			};
		}),
		paginationToken: response['@odata.nextLink'],
	};
}

export async function searchMessages(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	let response: IDataObject = {};

	if (paginationToken) {
		response = await microsoftApiRequest.call(
			this,
			'GET',
			'',
			undefined,
			undefined,
			paginationToken, // paginationToken contains the full URL
		);
	} else {
		const qs: IDataObject = {
			$select: 'id,subject,bodyPreview',
			$top: 100,
		};

		if (filter) {
			const filterValue = encodeURI(filter);
			qs.$search = `"subject:${filterValue}"`;
		}

		response = await microsoftApiRequest.call(this, 'GET', '/messages', undefined, qs);
	}

	return {
		results: (response.value as IDataObject[]).map((entry: IDataObject) => {
			return {
				name: (entry.subject || entry.bodyPreview) as string,
				value: entry.id as string,
			};
		}),
		paginationToken: response['@odata.nextLink'],
	};
}
