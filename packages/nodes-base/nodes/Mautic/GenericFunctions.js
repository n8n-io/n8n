import { NodeApiError } from 'n8n-workflow';
export async function mauticApiRequest(method, endpoint, body = {}, query, uri) {
    const authenticationMethod = this.getNodeParameter('authentication', 0, 'credentials');
    const options = {
        headers: {},
        method,
        qs: query,
        uri: uri || `/api${endpoint}`,
        body,
        json: true,
    };
    try {
        let returnData;
        if (authenticationMethod === 'credentials') {
            const credentials = await this.getCredentials('mauticApi');
            const baseUrl = credentials.url;
            options.uri = `${baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl}${options.uri}`;
            returnData = await this.helpers.requestWithAuthentication.call(this, 'mauticApi', options);
        }
        else {
            const credentials = await this.getCredentials('mauticOAuth2Api');
            const baseUrl = credentials.url;
            options.uri = `${baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl}${options.uri}`;
            returnData = await this.helpers.requestOAuth2.call(this, 'mauticOAuth2Api', options, {
                includeCredentialsOnRefreshOnBody: true,
            });
        }
        if (returnData.errors) {
            // They seem to sometimes return 200 status but still error.
            throw new NodeApiError(this.getNode(), returnData);
        }
        return returnData;
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
/**
 * Make an API request to paginated mautic endpoint
 * and return all results
 */
export async function mauticApiRequestAllItems(propertyName, method, endpoint, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    query.limit = 30;
    query.start = 0;
    do {
        responseData = await mauticApiRequest.call(this, method, endpoint, body, query);
        const values = Object.values(responseData[propertyName]);
        returnData.push.apply(returnData, values);
        query.start += query.limit;
    } while (responseData.total !== undefined &&
        returnData.length - parseInt(responseData.total, 10) < 0);
    return returnData;
}
export function validateJSON(json) {
    let result;
    try {
        result = JSON.parse(json);
    }
    catch (exception) {
        result = undefined;
    }
    return result;
}
//# sourceMappingURL=GenericFunctions.js.map