import type { IDataObject, ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';
import { microsoftApiRequest } from '../transport';

export async function searchCalendars(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const q = filter ? encodeURI(`${filter}`) : '';

	let resource = '/calendars';

	if (q) {
		resource = `/calendars/search(q='${q}')`;
	}

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
		response = await microsoftApiRequest.call(this, 'GET', resource, undefined, {
			// select: 'id,name,webUrl',
			$top: 100,
		});
	}

	return {
		results: (response.value as IDataObject[]).map((calendar: IDataObject) => {
			return {
				name: calendar.name as string,
				value: calendar.id as string,
				url: calendar.webUrl as string,
			};
		}),
		paginationToken: response['@odata.nextLink'],
	};
}
