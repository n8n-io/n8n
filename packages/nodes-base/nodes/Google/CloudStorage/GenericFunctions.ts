import type {
	IDataObject,
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INodeListSearchResult,
} from 'n8n-workflow';

import { getGoogleAccessToken } from '../GenericFunctions';

type AuthContext = IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions;

/**
 * Mints a short-lived OAuth access token for the configured Google service account
 * credential, scoped for the Cloud Storage and Resource Manager APIs.
 */
export async function fetchServiceAccountToken(this: AuthContext): Promise<string> {
	const credentials = await this.getCredentials('googleApi');
	const { access_token } = await getGoogleAccessToken.call(this, credentials, 'cloudStorage');
	return access_token as string;
}

/**
 * Declarative-routing preSend attached to the `authentication` parameter so it runs
 * for every operation. When the user has selected service-account auth, this mints
 * a token and injects the Authorization header. For OAuth2 it's a no-op — the
 * framework handles that credential's authenticate() automatically.
 */
export async function authenticateServiceAccount(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const authenticationMethod = this.getNodeParameter('authentication') as string;
	if (authenticationMethod !== 'serviceAccount') return requestOptions;

	const accessToken = await fetchServiceAccountToken.call(this);
	requestOptions.headers = {
		...requestOptions.headers,
		Authorization: `Bearer ${accessToken}`,
	};
	return requestOptions;
}

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

	const authenticationMethod = this.getNodeParameter('authentication', 'oAuth2') as string;

	let response;
	if (authenticationMethod === 'serviceAccount') {
		const accessToken = await fetchServiceAccountToken.call(this);
		response = await this.helpers.httpRequest({
			method: 'GET',
			url: 'https://cloudresourcemanager.googleapis.com/v1/projects',
			qs,
			headers: { Authorization: `Bearer ${accessToken}` },
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
