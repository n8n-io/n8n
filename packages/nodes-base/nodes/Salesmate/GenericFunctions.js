import { NodeApiError } from 'n8n-workflow';
export async function salesmateApiRequest(method, resource, body = {}, qs = {}, uri, _option = {}) {
    const credentials = await this.getCredentials('salesmateApi');
    const options = {
        headers: {
            sessionToken: credentials.sessionToken,
            'x-linkname': credentials.url,
            'Content-Type': 'application/json',
        },
        method,
        qs,
        body,
        uri: uri || `https://apis.salesmate.io${resource}`,
        json: true,
    };
    if (!Object.keys(body).length) {
        delete options.body;
    }
    try {
        return await this.helpers.request(options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function salesmateApiRequestAllItems(propertyName, method, resource, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    query.pageNo = 1;
    query.rows = 25;
    do {
        responseData = await salesmateApiRequest.call(this, method, resource, body, query);
        returnData.push.apply(returnData, responseData[propertyName].data);
        query.pageNo++;
    } while (responseData[propertyName].totalPages !== undefined &&
        query.pageNo <= responseData[propertyName].totalPages);
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
/**
 * Converts data from the Salesmate format into a simple object
 *
 */
export function simplifySalesmateData(data) {
    const returnData = {};
    for (const item of data) {
        returnData[item.fieldName] = item.value;
    }
    return returnData;
}
//# sourceMappingURL=GenericFunctions.js.map