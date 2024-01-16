import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';

import { apiRequest } from '../transport';

export async function fileSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const { data } = await apiRequest.call(this, 'GET', '/files');

	if (filter) {
		const results: INodeListSearchItems[] = [];

		for (const file of data || []) {
			if ((file.filename as string)?.toLowerCase().includes(filter.toLowerCase())) {
				results.push({
					name: file.filename as string,
					value: file.id as string,
				});
			}
		}

		return {
			results,
		};
	} else {
		return {
			results: (data || []).map((file: IDataObject) => ({
				name: file.filename as string,
				value: file.id as string,
			})),
		};
	}
}
