import { NodeApiError } from 'n8n-workflow';
export async function xeroApiRequest(method, resource, body = {}, qs = {}, uri, headers = {}) {
    const options = {
        headers: {
            'Content-Type': 'application/json',
        },
        method,
        body,
        qs,
        uri: uri || `https://api.xero.com/api.xro/2.0${resource}`,
        json: true,
    };
    try {
        if (body.organizationId) {
            options.headers = { ...options.headers, 'Xero-tenant-id': body.organizationId };
            delete body.organizationId;
        }
        if (Object.keys(headers).length !== 0) {
            options.headers = Object.assign({}, options.headers, headers);
        }
        if (Object.keys(body).length === 0) {
            delete options.body;
        }
        return await this.helpers.requestOAuth2.call(this, 'xeroOAuth2Api', options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function xeroApiRequestAllItems(propertyName, method, endpoint, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    query.page = 1;
    do {
        responseData = await xeroApiRequest.call(this, method, endpoint, body, query);
        query.page++;
        returnData.push.apply(returnData, responseData[propertyName]);
    } while (responseData[propertyName].length !== 0);
    return returnData;
}
//# sourceMappingURL=GenericFunctions.js.map