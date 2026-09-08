import { BINARY_ENCODING, NodeApiError, NodeOperationError } from 'n8n-workflow';
function getEnvironment(env) {
    return {
        sanbox: 'https://api-m.sandbox.paypal.com',
        live: 'https://api-m.paypal.com',
    }[env];
}
async function getAccessToken() {
    const credentials = await this.getCredentials('payPalApi');
    const env = getEnvironment(credentials.env);
    const data = Buffer.from(`${credentials.clientId}:${credentials.secret}`).toString(BINARY_ENCODING);
    const headerWithAuthentication = Object.assign({}, { Authorization: `Basic ${data}`, 'Content-Type': 'application/x-www-form-urlencoded' });
    const options = {
        headers: headerWithAuthentication,
        method: 'POST',
        form: {
            grant_type: 'client_credentials',
        },
        uri: `${env}/v1/oauth2/token`,
        json: true,
    };
    try {
        return await this.helpers.request(options);
    }
    catch (error) {
        throw new NodeOperationError(this.getNode(), error);
    }
}
export async function payPalApiRequest(endpoint, method, body = {}, query, uri) {
    const credentials = await this.getCredentials('payPalApi');
    const env = getEnvironment(credentials.env);
    const tokenInfo = await getAccessToken.call(this);
    const headerWithAuthentication = Object.assign({}, { Authorization: `Bearer ${tokenInfo.access_token}`, 'Content-Type': 'application/json' });
    const options = {
        headers: headerWithAuthentication,
        method,
        qs: query || {},
        uri: uri || `${env}/v1${endpoint}`,
        body,
        json: true,
    };
    try {
        return await this.helpers.request(options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
function getNext(links) {
    for (const link of links) {
        if (link.rel === 'next') {
            return link.href;
        }
    }
    return undefined;
}
/**
 * Make an API request to paginated paypal endpoint
 * and return all results
 */
export async function payPalApiRequestAllItems(propertyName, endpoint, method, body = {}, query, uri) {
    const returnData = [];
    let responseData;
    query.page_size = 1000;
    do {
        responseData = await payPalApiRequest.call(this, endpoint, method, body, query, uri);
        uri = getNext(responseData.links);
        returnData.push.apply(returnData, responseData[propertyName]);
    } while (getNext(responseData.links) !== undefined);
    return returnData;
}
export function validateJSON(json) {
    let result;
    try {
        result = JSON.parse(json);
    }
    catch (exception) {
        result = '';
    }
    return result;
}
export function upperFist(s) {
    return s
        .split('.')
        .map((e) => {
        return e.toLowerCase().charAt(0).toUpperCase() + e.toLowerCase().slice(1);
    })
        .join(' ');
}
//# sourceMappingURL=GenericFunctions.js.map