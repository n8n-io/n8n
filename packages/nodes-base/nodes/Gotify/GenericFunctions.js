import { NodeApiError } from 'n8n-workflow';
export async function gotifyApiRequest(method, path, body = {}, qs = {}, uri, _option = {}) {
    const credentials = await this.getCredentials('gotifyApi');
    const options = {
        method,
        headers: {
            'X-Gotify-Key': method === 'POST' ? credentials.appApiToken : credentials.clientApiToken,
            accept: 'application/json',
        },
        body,
        qs,
        uri: uri || `${credentials.url}${path}`,
        json: true,
        rejectUnauthorized: !credentials.ignoreSSLIssues,
    };
    try {
        if (Object.keys(body).length === 0) {
            delete options.body;
        }
        return await this.helpers.request.call(this, options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function gotifyApiRequestAllItems(propertyName, method, endpoint, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    let uri;
    query.limit = 100;
    do {
        responseData = await gotifyApiRequest.call(this, method, endpoint, body, query, uri);
        if (responseData.paging.next) {
            uri = responseData.paging.next;
        }
        returnData.push.apply(returnData, responseData[propertyName]);
    } while (responseData.paging.next);
    return returnData;
}
//# sourceMappingURL=GenericFunctions.js.map