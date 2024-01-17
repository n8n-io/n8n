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

export async function modelCompletionSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	let { data } = await apiRequest.call(this, 'GET', '/models');
	data = data?.filter((model: IDataObject) => (model.id as string).startsWith('gpt-'));

	if (filter) {
		const results: INodeListSearchItems[] = [];

		for (const model of data || []) {
			if ((model.id as string)?.toLowerCase().includes(filter.toLowerCase())) {
				results.push({
					name: (model.id as string).toUpperCase(),
					value: model.id as string,
				});
			}
		}

		return {
			results,
		};
	} else {
		return {
			results: (data || []).map((model: IDataObject) => ({
				name: (model.id as string).toUpperCase(),
				value: model.id as string,
			})),
		};
	}
}
