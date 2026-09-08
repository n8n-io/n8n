export async function ghostApiRequest(method, endpoint, body = {}, query = {}, uri) {
    const source = this.getNodeParameter('source', 0);
    let version;
    let credentialType;
    if (source === 'contentApi') {
        //https://ghost.org/faq/api-versioning/
        version = 'v3';
        credentialType = 'ghostContentApi';
    }
    else {
        version = 'v2';
        credentialType = 'ghostAdminApi';
    }
    const credentials = await this.getCredentials(credentialType);
    const options = {
        method,
        qs: query,
        uri: uri || `${credentials.url}/ghost/api/${version}${endpoint}`,
        body,
        json: true,
    };
    return await this.helpers.requestWithAuthentication.call(this, credentialType, options);
}
export async function ghostApiRequestAllItems(propertyName, method, endpoint, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    query.limit = 50;
    query.page = 1;
    do {
        responseData = await ghostApiRequest.call(this, method, endpoint, body, query);
        query.page = responseData.meta.pagination.next;
        returnData.push.apply(returnData, responseData[propertyName]);
    } while (query.page !== null);
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
//# sourceMappingURL=GenericFunctions.js.map