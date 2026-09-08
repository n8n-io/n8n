import { getGoogleAccessToken } from '../GenericFunctions';
/**
 * Mints a short-lived OAuth access token for the configured Google service account
 * credential, scoped for the Cloud Storage and Resource Manager APIs.
 */
export async function fetchServiceAccountToken() {
    const credentials = await this.getCredentials('googleApi');
    const { access_token } = await getGoogleAccessToken.call(this, credentials, 'cloudStorage');
    return access_token;
}
/**
 * Declarative-routing preSend attached to the `authentication` parameter so it runs
 * for every operation. When the user has selected service-account auth, this mints
 * a token and injects the Authorization header. For OAuth2 it's a no-op — the
 * framework handles that credential's authenticate() automatically.
 */
export async function authenticateServiceAccount(requestOptions) {
    const authenticationMethod = this.getNodeParameter('authentication');
    if (authenticationMethod !== 'serviceAccount')
        return requestOptions;
    const accessToken = await fetchServiceAccountToken.call(this);
    requestOptions.headers = {
        ...requestOptions.headers,
        Authorization: `Bearer ${accessToken}`,
    };
    return requestOptions;
}
export async function searchProjects(filter, paginationToken) {
    const qs = {};
    if (paginationToken) {
        qs.pageToken = paginationToken;
    }
    // Use server-side filtering so the API only returns matching projects across all pages,
    // rather than fetching a full page and discarding non-matching results on the client.
    // lifecycleState:ACTIVE excludes projects pending deletion.
    if (filter) {
        qs.filter = `(name:${filter}* OR id:${filter}*) AND lifecycleState:ACTIVE`;
    }
    else {
        qs.filter = 'lifecycleState:ACTIVE';
    }
    const authenticationMethod = this.getNodeParameter('authentication', 'oAuth2');
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
    }
    else {
        response = await this.helpers.requestOAuth2.call(this, 'googleCloudStorageOAuth2Api', {
            method: 'GET',
            url: 'https://cloudresourcemanager.googleapis.com/v1/projects',
            qs,
            json: true,
        });
    }
    const projects = response.projects ?? [];
    return {
        results: projects.map((project) => ({
            name: `${project.name} (${project.projectId})`,
            value: project.projectId,
            url: `https://console.cloud.google.com/storage/browser?project=${project.projectId}`,
        })),
        paginationToken: response.nextPageToken,
    };
}
//# sourceMappingURL=GenericFunctions.js.map