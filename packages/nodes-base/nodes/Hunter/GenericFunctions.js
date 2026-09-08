import { NodeApiError } from 'n8n-workflow';
export async function hunterApiRequest(method, resource, body = {}, qs = {}, uri, option = {}) {
    const credentials = await this.getCredentials('hunterApi');
    qs = Object.assign({ api_key: credentials.apiKey }, qs);
    let options = {
        method,
        qs,
        body,
        uri: uri || `https://api.hunter.io/v2${resource}`,
        json: true,
    };
    options = Object.assign({}, options, option);
    if (Object.keys(options.body).length === 0) {
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
 * Make an API request to paginated flow endpoint
 * and return all results
 */
export async function hunterApiRequestAllItems(propertyName, method, resource, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    query.offset = 0;
    query.limit = 100;
    do {
        responseData = await hunterApiRequest.call(this, method, resource, body, query);
        returnData.push(responseData[propertyName]);
        query.offset += query.limit;
    } while (responseData.meta?.results !== undefined &&
        responseData.meta.offset <= responseData.meta.results);
    return returnData;
}
//# sourceMappingURL=GenericFunctions.js.map