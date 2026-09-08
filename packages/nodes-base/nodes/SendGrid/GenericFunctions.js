export async function sendGridApiRequest(endpoint, method, body = {}, qs = {}, option = {}) {
    const host = 'api.sendgrid.com/v3';
    const options = {
        method,
        qs,
        body,
        uri: `https://${host}${endpoint}`,
        json: true,
    };
    if (Object.keys(body).length === 0) {
        delete options.body;
    }
    if (Object.keys(option).length !== 0) {
        Object.assign(options, option);
    }
    return await this.helpers.requestWithAuthentication.call(this, 'sendGridApi', options);
}
export async function sendGridApiRequestAllItems(endpoint, method, propertyName, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    let uri;
    do {
        responseData = await sendGridApiRequest.call(this, endpoint, method, body, query, uri); // possible bug, as function does not have uri parameter
        uri = responseData._metadata.next;
        returnData.push.apply(returnData, responseData[propertyName]);
        const limit = query.limit;
        if (limit && returnData.length >= limit) {
            return returnData;
        }
    } while (responseData._metadata.next !== undefined);
    return returnData;
}
//# sourceMappingURL=GenericFunctions.js.map