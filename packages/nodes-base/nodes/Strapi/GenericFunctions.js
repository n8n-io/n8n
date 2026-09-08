import { NodeApiError } from 'n8n-workflow';
import { removeTrailingSlash } from '../../utils/utilities';
export async function strapiApiRequest(method, resource, body = {}, qs = {}, uri, headers = {}) {
    const authenticationMethod = this.getNodeParameter('authentication', 0);
    let credentials;
    if (authenticationMethod === 'password') {
        credentials = await this.getCredentials('strapiApi');
    }
    else {
        credentials = await this.getCredentials('strapiTokenApi');
    }
    const url = removeTrailingSlash(credentials.url);
    try {
        const options = {
            headers: {},
            method,
            body,
            qs,
            uri: uri || credentials.apiVersion === 'v4' ? `${url}/api${resource}` : `${url}${resource}`,
            json: true,
            qsStringifyOptions: {
                arrayFormat: 'indices',
            },
        };
        if (Object.keys(headers).length !== 0) {
            options.headers = Object.assign({}, options.headers, headers);
        }
        if (Object.keys(body).length === 0) {
            delete options.body;
        }
        return await this.helpers.requestWithAuthentication.call(this, authenticationMethod === 'password' ? 'strapiApi' : 'strapiTokenApi', options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function getToken() {
    const credentials = await this.getCredentials('strapiApi');
    const url = removeTrailingSlash(credentials.url);
    let options = {};
    options = {
        headers: {
            'content-type': 'application/json',
        },
        method: 'POST',
        body: {
            identifier: credentials.email,
            password: credentials.password,
        },
        uri: credentials.apiVersion === 'v4' ? `${url}/api/auth/local` : `${url}/auth/local`,
        json: true,
    };
    return await this.helpers.request(options);
}
export async function strapiApiRequestAllItems(method, resource, body = {}, query = {}, headers = {}, apiVersion = 'v3') {
    const returnData = [];
    let responseData;
    if (apiVersion === 'v4') {
        query['pagination[pageSize]'] = 20;
        query['pagination[page]'] = 1;
        do {
            ({ data: responseData } = await strapiApiRequest.call(this, method, resource, body, query, undefined, headers));
            query['pagination[page]']++;
            returnData.push.apply(returnData, responseData);
        } while (responseData.length !== 0);
    }
    else {
        query._limit = 20;
        query._start = 0;
        do {
            responseData = await strapiApiRequest.call(this, method, resource, body, query, undefined, headers);
            query._start += query._limit;
            returnData.push.apply(returnData, responseData);
        } while (responseData.length !== 0);
    }
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