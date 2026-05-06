import type { IDataObject, ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

export async function searchProjects(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const qs: IDataObject = {};
	if (paginationToken) {
		qs.pageToken = paginationToken;
	}

	const response = await this.helpers.requestOAuth2.call(this, 'googleCloudStorageOAuth2Api', {
		method: 'GET',
		url: 'https://cloudresourcemanager.googleapis.com/v1/projects',
		qs,
		json: true,
	});

	let projects = (response.projects as IDataObject[]) ?? [];

	if (filter) {
		const lowerFilter = filter.toLowerCase();
		projects = projects.filter(
			(project) =>
				(project.name as string)?.toLowerCase().includes(lowerFilter) ||
				(project.projectId as string)?.toLowerCase().includes(lowerFilter),
		);
	}

	return {
		results: projects.map((project) => ({
			name: `${project.name as string} (${project.projectId as string})`,
			value: project.projectId as string,
			url: `https://console.cloud.google.com/storage/browser?project=${project.projectId as string}`,
		})),
		paginationToken: response.nextPageToken as string | undefined,
	};
}
