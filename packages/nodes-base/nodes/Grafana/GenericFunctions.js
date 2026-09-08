import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { removeTrailingSlash } from '@utils/utilities';
export async function grafanaApiRequest(method, endpoint, body = {}, qs = {}) {
    const { baseUrl: rawBaseUrl } = await this.getCredentials('grafanaApi');
    const baseUrl = removeTrailingSlash(rawBaseUrl);
    const options = {
        headers: {
            'Content-Type': 'application/json',
        },
        method,
        body,
        qs,
        uri: `${baseUrl}/api${endpoint}`,
        json: true,
    };
    if (!Object.keys(body).length) {
        delete options.body;
    }
    if (!Object.keys(qs).length) {
        delete options.qs;
    }
    try {
        return await this.helpers.requestWithAuthentication.call(this, 'grafanaApi', options);
    }
    catch (error) {
        if (error?.response?.data?.message === 'Team member not found') {
            error.response.data.message += '. Are you sure the user is a member of this team?';
        }
        if (error?.response?.data?.message === 'Team not found') {
            error.response.data.message += ' with the provided ID';
        }
        if (error?.response?.data?.message ===
            'A dashboard with the same name in the folder already exists') {
            error.response.data.message =
                'A dashboard with the same name already exists in the selected folder';
        }
        if (error?.response?.data?.message === 'Team name taken') {
            error.response.data.message = 'This team name is already taken. Please choose a new one.';
        }
        if (error?.code === 'ECONNREFUSED') {
            error.message =
                'Invalid credentials or error in establishing connection with given credentials';
        }
        throw new NodeApiError(this.getNode(), error);
    }
}
export function throwOnEmptyUpdate(resource, updateFields) {
    if (!Object.keys(updateFields).length) {
        throw new NodeOperationError(this.getNode(), `Please enter at least one field to update for the ${resource}.`);
    }
}
export function deriveUid(uidOrUrl) {
    if (!uidOrUrl.startsWith('http'))
        return uidOrUrl;
    const urlSegments = uidOrUrl.split('/');
    const uid = urlSegments[urlSegments.indexOf('d') + 1];
    if (!uid) {
        throw new NodeOperationError(this.getNode(), 'Failed to derive UID from URL');
    }
    return uid;
}
//# sourceMappingURL=GenericFunctions.js.map