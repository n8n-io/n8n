import { NodeApiError } from 'n8n-workflow';
export async function microsoftApiRequest(method, resource, body = {}, qs = {}, uri, headers = {}) {
    const options = {
        headers: {
            'Content-Type': 'application/json',
        },
        method,
        body,
        qs,
        uri: uri || `https://graph.microsoft.com/v1.0/me${resource}`,
        json: true,
    };
    try {
        if (Object.keys(headers).length !== 0) {
            options.headers = Object.assign({}, options.headers, headers);
        }
        return await this.helpers.requestOAuth2.call(this, 'microsoftExcelOAuth2Api', options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function microsoftApiRequestAllItems(propertyName, method, endpoint, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    let uri;
    query.$top = 100;
    do {
        responseData = await microsoftApiRequest.call(this, method, endpoint, body, query, uri);
        uri = responseData['@odata.nextLink'];
        if (uri?.includes('$top')) {
            delete query.$top;
        }
        returnData.push.apply(returnData, responseData[propertyName]);
    } while (responseData['@odata.nextLink'] !== undefined);
    return returnData;
}
export async function microsoftApiRequestAllItemsSkip(propertyName, method, endpoint, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    query.$top = 100;
    query.$skip = 0;
    do {
        responseData = await microsoftApiRequest.call(this, method, endpoint, body, query);
        query.$skip += query.$top;
        returnData.push.apply(returnData, responseData[propertyName]);
    } while (responseData.value.length !== 0);
    return returnData;
}
//# sourceMappingURL=GenericFunctions.js.map