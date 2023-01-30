import type { IDataObject, ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';
import { googleApiRequest } from '../transport';

export async function searchProjects(
	this: ILoadOptionsFunctions,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const qs = {
		pageToken: (paginationToken as string) || undefined,
	};

	const response = await googleApiRequest.call(this, 'GET', '/v2/projects', undefined, qs);
	return {
		results: response.projects.map((project: IDataObject) => ({
			name: project.friendlyName as string,
			value: project.id,
			url: `https://console.cloud.google.com/bigquery?project=${project.id as string}`,
		})),
		paginationToken: response.nextPageToken,
	};
}
