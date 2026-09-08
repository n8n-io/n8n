import { NodeApiError } from 'n8n-workflow';
/**
 * Make an API request to Airtable
 *
 */
export async function apiRequest(method, endpoint, body, query, uri, option = {}) {
    const credentials = await this.getCredentials('stackbyApi');
    const options = {
        headers: {
            'api-key': credentials.apiKey,
            'Content-Type': 'application/json',
        },
        method,
        body,
        qs: query,
        uri: uri || `https://stackby.com/api/betav1${endpoint}`,
        json: true,
    };
    if (Object.keys(option).length !== 0) {
        Object.assign(options, option);
    }
    if (Object.keys(body).length === 0) {
        delete options.body;
    }
    try {
        return await this.helpers.request(options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
/**
 * Make an API request to paginated Airtable endpoint
 * and return all results
 *
 * @param {(IHookFunctions | IExecuteFunctions)} this
 */
export async function apiRequestAllItems(method, endpoint, body = {}, query = {}) {
    query.maxrecord = 100;
    query.offset = 0;
    const returnData = [];
    let responseData;
    do {
        responseData = await apiRequest.call(this, method, endpoint, body, query);
        returnData.push.apply(returnData, responseData);
        query.offset += query.maxrecord;
    } while (responseData.length !== 0);
    return returnData;
}
//# sourceMappingURL=GenericFunction.js.map