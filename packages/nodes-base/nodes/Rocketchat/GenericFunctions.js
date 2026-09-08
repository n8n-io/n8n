export async function rocketchatApiRequest(resource, method, operation, body = {}, queryParams, headers) {
    const credentials = await this.getCredentials('rocketchatApi');
    const options = {
        headers,
        method,
        body,
        uri: `${credentials.domain}/api/v1${resource}.${operation}`,
        qs: queryParams,
        json: true,
    };
    if (Object.keys(options.body).length === 0) {
        delete options.body;
    }
    return await this.helpers.requestWithAuthentication.call(this, 'rocketchatApi', options);
}
export async function rocketchatApiRequestAllItems(propertyName, resource, method, operation, body = {}, queryParams = {}) {
    const returnData = [];
    let responseData;
    let offset = 0;
    const { limit: _limit, ...paginationQuery } = queryParams;
    const count = paginationQuery.count ?? 100;
    do {
        responseData = (await rocketchatApiRequest.call(this, resource, method, operation, body, {
            ...paginationQuery,
            offset,
            count,
        }));
        const responseItems = responseData[propertyName];
        if (!Array.isArray(responseItems) || responseItems.length === 0) {
            break;
        }
        returnData.push.apply(returnData, responseItems);
        offset = returnData.length;
    } while (returnData.length < (responseData.total ?? Number.POSITIVE_INFINITY));
    return returnData;
}
export function validateJSON(json) {
    let result;
    try {
        result = JSON.parse(json);
    }
    catch (exception) {
        result = [];
    }
    return result;
}
//# sourceMappingURL=GenericFunctions.js.map