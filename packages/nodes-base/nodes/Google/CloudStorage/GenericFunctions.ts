import type { IDataObject, ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

import { getGoogleAccessToken } from '../GenericFunctions';

export async function searchProjects(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const qs: IDataObject = {};
	if (paginationToken) {
		qs.pageToken = paginationToken;
	}
	// Use server-side filtering so the API only returns matching projects across all pages,
	// rather than fetching a full page and discarding non-matching results on the client.
	// lifecycleState:ACTIVE excludes projects pending deletion.
	if (filter) {
		qs.filter = `(name:${filter}* OR id:${filter}*) AND lifecycleState:ACTIVE`;
	} else {
		qs.filter = 'lifecycleState:ACTIVE';
	}

	const authenticationMethod = this.getNodeParameter('authentication', 0, 'oAuth2') as string;

	let response;
	if (authenticationMethod === 'serviceAccount') {
		const credentials = await this.getCredentials('googleCloudStorageApi');
		const { access_token } = await getGoogleAccessToken.call(this, credentials, 'cloudStorage');
		response = await this.helpers.httpRequest({
			method: 'GET',
			url: 'https://cloudresourcemanager.googleapis.com/v1/projects',
			qs,
			headers: { Authorization: `Bearer ${access_token}` },
			json: true,
		});
	} else {
		response = await this.helpers.requestOAuth2.call(this, 'googleCloudStorageOAuth2Api', {
			method: 'GET',
			url: 'https://cloudresourcemanager.googleapis.com/v1/projects',
			qs,
			json: true,
		});
	}

	const projects = (response.projects as IDataObject[]) ?? [];

	return {
		results: projects.map((project) => ({
			name: `${project.name as string} (${project.projectId as string})`,
			value: project.projectId as string,
			url: `https://console.cloud.google.com/storage/browser?project=${project.projectId as string}`,
		})),
		paginationToken: response.nextPageToken as string | undefined,
	};
}
