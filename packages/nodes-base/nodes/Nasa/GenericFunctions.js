import { NodeApiError } from 'n8n-workflow';
export async function nasaApiRequest(method, endpoint, qs, option = {}, uri) {
    const credentials = await this.getCredentials('nasaApi');
    qs.api_key = credentials.api_key;
    const options = {
        method,
        qs,
        uri: uri || `https://api.nasa.gov${endpoint}`,
        json: true,
    };
    if (Object.keys(option)) {
        Object.assign(options, option);
    }
    try {
        return await this.helpers.request(options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function nasaApiRequestAllItems(propertyName, method, resource, query = {}) {
    const returnData = [];
    let responseData;
    query.size = 20;
    let uri = undefined;
    do {
        responseData = await nasaApiRequest.call(this, method, resource, query, {}, uri);
        uri = responseData.links.next;
        returnData.push.apply(returnData, responseData[propertyName]);
    } while (responseData.links.next !== undefined);
    return returnData;
}
//# sourceMappingURL=GenericFunctions.js.map