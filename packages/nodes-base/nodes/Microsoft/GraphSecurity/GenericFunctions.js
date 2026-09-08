import { NodeApiError, NodeOperationError } from 'n8n-workflow';
/**
 * Resolves which credential type the node is configured to use. Defaults to the
 * node-specific `microsoftGraphSecurityOAuth2Api` so existing workflows (and
 * nodes without an explicit `authentication` selection) keep working unchanged,
 * while allowing the generic `microsoftOAuth2Api` (Graph) credential to be
 * selected.
 */
export function getGraphSecurityCredentialType() {
    return this.getNodeParameter('authentication', 0) === 'microsoftOAuth2Api'
        ? 'microsoftOAuth2Api'
        : 'microsoftGraphSecurityOAuth2Api';
}
export async function msGraphSecurityApiRequest(method, endpoint, body = {}, qs = {}, headers = {}) {
    const credentialType = getGraphSecurityCredentialType.call(this);
    const credentials = await this.getCredentials(credentialType);
    const { oauthTokenData: { access_token }, } = credentials;
    if (!access_token) {
        throw new NodeOperationError(this.getNode(), 'No access token found in the credential. Reconnect the OAuth2 credential.');
    }
    const baseUrl = (typeof credentials.graphApiBaseUrl === 'string' && credentials.graphApiBaseUrl !== ''
        ? credentials.graphApiBaseUrl
        : 'https://graph.microsoft.com').replace(/\/+$/, '');
    const options = {
        headers: {
            Authorization: `Bearer ${access_token}`,
        },
        method,
        body,
        qs,
        uri: `${baseUrl}/v1.0/security${endpoint}`,
        json: true,
    };
    if (!Object.keys(body).length) {
        delete options.body;
    }
    if (!Object.keys(qs).length) {
        delete options.qs;
    }
    if (Object.keys(headers).length) {
        options.headers = { ...options.headers, ...headers };
    }
    try {
        return await this.helpers.request(options);
    }
    catch (error) {
        const nestedMessage = error?.error?.error?.message;
        if (nestedMessage?.startsWith('{"')) {
            error = JSON.parse(nestedMessage);
        }
        if (nestedMessage?.startsWith('Http request failed with statusCode=BadRequest')) {
            error.error.error.message = 'Request failed with bad request';
        }
        else if (nestedMessage?.startsWith('Http request failed with')) {
            const stringified = nestedMessage?.split(': ').pop();
            if (stringified) {
                error = JSON.parse(stringified);
            }
        }
        if (typeof nestedMessage === 'string' &&
            ['Invalid filter clause', 'Invalid ODATA query filter'].includes(nestedMessage)) {
            error.error.error.message +=
                ' - Please check that your query parameter syntax is correct: https://docs.microsoft.com/en-us/graph/query-parameters#filter-parameter';
        }
        throw new NodeApiError(this.getNode(), error);
    }
}
export function tolerateDoubleQuotes(filterQueryParameter) {
    return filterQueryParameter.replace(/"/g, "'");
}
export function throwOnEmptyUpdate() {
    throw new NodeOperationError(this.getNode(), 'Please enter at least one field to update');
}
//# sourceMappingURL=GenericFunctions.js.map