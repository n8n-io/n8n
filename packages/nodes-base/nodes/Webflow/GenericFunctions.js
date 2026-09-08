export async function webflowApiRequest(method, resource, body = {}, qs = {}, uri, option = {}) {
    let credentialsType = 'webflowOAuth2Api';
    let options = {
        method,
        qs,
        body,
        url: uri || `https://api.webflow.com${resource}`,
        json: true,
    };
    options = Object.assign({}, options, option);
    // Keep support for v1 node
    if (this.getNode().typeVersion === 1) {
        const authenticationMethod = this.getNodeParameter('authentication', 0, 'accessToken');
        if (authenticationMethod === 'accessToken') {
            credentialsType = 'webflowApi';
        }
        options.headers = { 'accept-version': '1.0.0' };
    }
    else {
        options.returnFullResponse = true;
        options.url = `https://api.webflow.com/v2${resource}`;
    }
    if (Object.keys(options.qs).length === 0) {
        delete options.qs;
    }
    if (Object.keys(options.body).length === 0) {
        delete options.body;
    }
    return await this.helpers.httpRequestWithAuthentication.call(this, credentialsType, options);
}
export async function webflowApiRequestAllItems(method, endpoint, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    query.limit = 100;
    query.offset = 0;
    const isTypeVersion1 = this.getNode().typeVersion === 1;
    do {
        responseData = await webflowApiRequest.call(this, method, endpoint, body, query);
        const items = isTypeVersion1 ? responseData.items : responseData.body.items;
        returnData.push(...items);
        if (responseData.offset !== undefined || responseData?.body?.pagination?.offset !== undefined) {
            query.offset += query.limit;
        }
    } while (isTypeVersion1
        ? returnData.length < responseData.total
        : returnData.length < responseData.body.pagination.total);
    return returnData;
}
// Load Options
export async function getSites() {
    const returnData = [];
    const response = await webflowApiRequest.call(this, 'GET', '/sites');
    const sites = response.body?.sites || response;
    for (const site of sites) {
        returnData.push({
            name: site.displayName || site.name,
            value: site.id || site._id,
        });
    }
    return returnData;
}
export async function getCollections() {
    const returnData = [];
    const siteId = this.getCurrentNodeParameter('siteId');
    const response = await webflowApiRequest.call(this, 'GET', `/sites/${siteId}/collections`);
    const collections = response.body?.collections || response;
    for (const collection of collections) {
        returnData.push({
            name: collection.displayName || collection.name,
            value: collection.id || collection._id,
        });
    }
    return returnData;
}
export async function getFields() {
    const returnData = [];
    const collectionId = this.getCurrentNodeParameter('collectionId');
    const response = await webflowApiRequest.call(this, 'GET', `/collections/${collectionId}`);
    const fields = response.body?.fields || response;
    for (const field of fields) {
        returnData.push({
            name: `${field.displayName || field.name} (${field.type}) ${field.isRequired || field.required ? ' (required)' : ''}`,
            value: field.slug,
        });
    }
    return returnData;
}
//# sourceMappingURL=GenericFunctions.js.map