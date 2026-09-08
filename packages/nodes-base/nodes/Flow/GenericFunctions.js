import { NodeApiError } from 'n8n-workflow';
export async function flowApiRequest(method, resource, body = {}, qs = {}, uri, option = {}) {
    const credentials = await this.getCredentials('flowApi');
    let options = {
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
        method,
        qs,
        body,
        uri: uri || `https://api.getflow.com/v2${resource}`,
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
export async function FlowApiRequestAllItems(propertyName, method, resource, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    query.limit = 100;
    let uri;
    do {
        responseData = await flowApiRequest.call(this, method, resource, body, query, uri, {
            resolveWithFullResponse: true,
        });
        uri = responseData.headers.link;
        returnData.push.apply(returnData, responseData.body[propertyName]);
    } while (responseData.headers.link !== undefined && responseData.headers.link !== '');
    return returnData;
}
//# sourceMappingURL=GenericFunctions.js.map