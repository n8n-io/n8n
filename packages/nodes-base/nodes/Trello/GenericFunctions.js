/**
 * Make an API request to Trello
 *
 */
export async function apiRequest(method, endpoint, body, query) {
    query = query || {};
    const options = {
        method,
        body,
        qs: query,
        uri: `https://api.trello.com/1/${endpoint}`,
        json: true,
    };
    if (method === 'GET') {
        delete options.body;
    }
    const authentication = this.getNodeParameter('authentication', 0, 'apiKey');
    if (authentication === 'oAuth1') {
        return await this.helpers.requestOAuth1.call(this, 'trelloOAuth1Api', options);
    }
    return await this.helpers.requestWithAuthentication.call(this, 'trelloApi', options);
}
export async function apiRequestAllItems(method, endpoint, body, query = {}) {
    query.limit = 30;
    query.sort = '-id';
    const returnData = [];
    let responseData;
    do {
        responseData = await apiRequest.call(this, method, endpoint, body, query);
        returnData.push.apply(returnData, responseData);
        if (responseData.length !== 0) {
            query.before = responseData[responseData.length - 1].id;
        }
    } while (query.limit <= responseData.length);
    return returnData;
}
//# sourceMappingURL=GenericFunctions.js.map