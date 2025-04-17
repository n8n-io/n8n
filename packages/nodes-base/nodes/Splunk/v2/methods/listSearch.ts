import type { IDataObject, ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

import { splunkApiJsonRequest } from '../transport';

export async function searchReports(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const qs: IDataObject = {};

	if (filter) {
		qs.search = filter;
	}

	const endpoint = '/services/saved/searches';
	const response = await splunkApiJsonRequest.call(this, 'GET', endpoint, undefined, qs);

	return {
		results: (response as IDataObject[]).map((entry: IDataObject) => {
			return {
				name: entry.name as string,
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
	const response = await splunkApiJsonRequest.call(this, 'GET', endpoint, undefined, qs);

	return {
		results: (response as IDataObject[]).map((entry: IDataObject) => {
			return {
				name: (entry.name as string).replace(/^\|\s*/, ''),
				value: entry.id as string,
				url: entry.entryUrl as string,
			};
		}),
	};
}

export async function searchUsers(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const qs: IDataObject = {};

	if (filter) {
		qs.search = filter;
	}

	const endpoint = '/services/authentication/users';
	const response = await splunkApiJsonRequest.call(this, 'GET', endpoint, undefined, qs);

	return {
		results: (response as IDataObject[]).map((entry: IDataObject) => {
			return {
				name: entry.name as string,
				value: entry.id as string,
				url: entry.entryUrl as string,
			};
		}),
	};
}
