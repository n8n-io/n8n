import { NodeApiError } from 'n8n-workflow';
export async function storyblokApiRequest(method, resource, body = {}, qs = {}, option = {}) {
    const authenticationMethod = this.getNodeParameter('source', 0);
    let options = {
        headers: {
            'Content-Type': 'application/json',
        },
        method,
        qs,
        body,
        uri: '',
        json: true,
    };
    options = Object.assign({}, options, option);
    if (Object.keys(options.body).length === 0) {
        delete options.body;
    }
    if (authenticationMethod === 'contentApi') {
        const credentials = await this.getCredentials('storyblokContentApi');
        options.uri = `https://api.storyblok.com${resource}`;
        Object.assign(options.qs ?? {}, { token: credentials.apiKey });
    }
    else {
        const credentials = await this.getCredentials('storyblokManagementApi');
        options.uri = `https://mapi.storyblok.com${resource}`;
        if (options.headers) {
            Object.assign(options.headers, { Authorization: credentials.accessToken });
        }
    }
    try {
        return await this.helpers.request(options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function storyblokApiRequestAllItems(propertyName, method, resource, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    query.per_page = 100;
    query.page = 1;
    do {
        responseData = await storyblokApiRequest.call(this, method, resource, body, query);
        query.page++;
        returnData.push.apply(returnData, responseData[propertyName]);
    } while (responseData[propertyName].length !== 0);
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