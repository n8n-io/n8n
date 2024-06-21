import type { IDataObject, ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';
import { splunkApiRequest } from '../transport';
import { formatFeed } from '../helpers/utils';

export async function searchReports(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const qs: IDataObject = {};

	if (filter) {
		qs.search = filter;
	}

	const endpoint = '/services/saved/searches';
	const response = await splunkApiRequest
		.call(this, 'GET', endpoint, undefined, qs)
		.then(formatFeed);

	return {
		results: (response as IDataObject[]).map((entry: IDataObject) => {
			return {
				name: entry.title as string,
				value: entry.id as string,
				url: entry.entryUrl as string,
			};
		}),
	};
}

export async function searchJobs(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const qs: IDataObject = {};

	if (filter) {
		qs.search = filter;
	}

	const endpoint = '/services/search/jobs';
	const response = await splunkApiRequest
		.call(this, 'GET', endpoint, undefined, qs)
		.then(formatFeed);

	return {
		results: (response as IDataObject[]).map((entry: IDataObject) => {
			return {
				name: (entry.title as string).replace(/^\|\s*/, ''),
				value: entry.id as string,
				url: entry.entryUrl as string,
			};
		}),
	};
}
