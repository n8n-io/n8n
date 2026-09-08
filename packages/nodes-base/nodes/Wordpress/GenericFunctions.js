import { NodeApiError } from 'n8n-workflow';
export async function wordpressApiRequest(method, resource, body = {}, qs = {}, uri, option = {}) {
    const authType = this.getNodeParameter('authType', 0, 'basicAuth');
    const isOAuth2 = authType === 'oAuth2';
    let baseUri;
    let credentialType;
    let rejectUnauthorized;
    if (isOAuth2) {
        const credentials = await this.getCredentials('wordpressOAuth2Api');
        credentialType = 'wordpressOAuth2Api';
        let site = credentials.wordpressSite;
        try {
            site = new URL(site).hostname;
        }
        catch {
            site = site.split('/')[0];
        }
        baseUri = `https://public-api.wordpress.com/wp/v2/sites/${site}`;
    }
    else {
        const credentials = await this.getCredentials('wordpressApi');
        credentialType = 'wordpressApi';
        baseUri = `${credentials.url}/wp-json/wp/v2`;
        rejectUnauthorized = !credentials.allowUnauthorizedCerts;
    }
    const headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
    };
    // Some WordPress caching plugins ignore the request method and serve a cached
    // GET response to writes, which silently returns existing posts instead of creating one.
    if (!['GET', 'HEAD'].includes(method)) {
        headers['Cache-Control'] = 'no-cache';
    }
    let options = {
        headers,
        method,
        qs,
        body,
        uri: uri ?? `${baseUri}${resource}`,
        ...(rejectUnauthorized !== undefined ? { rejectUnauthorized } : {}),
        json: true,
    };
    options = Object.assign({}, options, option);
    if (Object.keys(options.body).length === 0) {
        delete options.body;
    }
    try {
        return await this.helpers.requestWithAuthentication.call(this, credentialType, options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function wordpressApiRequestAllItems(method, endpoint, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    query.per_page = 10;
    query.page = 0;
    do {
        query.page++;
        responseData = await wordpressApiRequest.call(this, method, endpoint, body, query, undefined, {
            resolveWithFullResponse: true,
        });
        returnData.push.apply(returnData, responseData.body);
    } while (responseData.headers['x-wp-totalpages'] !== undefined &&
        responseData.headers['x-wp-totalpages'] !== '0' &&
        parseInt(responseData.headers['x-wp-totalpages'], 10) !== query.page);
    return returnData;
}
//# sourceMappingURL=GenericFunctions.js.map