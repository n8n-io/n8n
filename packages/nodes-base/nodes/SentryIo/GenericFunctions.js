import { NodeApiError } from 'n8n-workflow';
export async function sentryIoApiRequest(method, resource, body = {}, qs = {}, uri, option = {}) {
    const authentication = this.getNodeParameter('authentication', 0);
    const options = {
        headers: {},
        method,
        qs,
        body,
        uri: uri || `https://sentry.io${resource}`,
        json: true,
    };
    if (!Object.keys(body).length) {
        delete options.body;
    }
    if (Object.keys(option).length !== 0) {
        Object.assign(options, option);
    }
    if (options.qs.limit) {
        delete options.qs.limit;
    }
    let credentialName;
    try {
        if (authentication === 'oAuth2') {
            return await this.helpers.requestOAuth2.call(this, 'sentryIoOAuth2Api', options);
        }
        if (authentication === 'accessToken') {
            credentialName = 'sentryIoApi';
        }
        else {
            credentialName = 'sentryIoServerApi';
        }
        const credentials = await this.getCredentials(credentialName);
        if (credentials.url) {
            options.uri = `${credentials?.url}${resource}`;
        }
        options.headers = {
            Authorization: `Bearer ${credentials?.token}`,
        };
        return await this.helpers.request(options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
function getNext(link) {
    if (link === undefined) {
        return;
    }
    const next = link.split(',')[1];
    if (next.includes('rel="next"')) {
        return next.split(';')[0].replace('<', '').replace('>', '').trim();
    }
}
function hasMore(link) {
    if (link === undefined) {
        return;
    }
    const next = link.split(',')[1];
    if (next.includes('rel="next"')) {
        return next.includes('results="true"');
    }
}
export async function sentryApiRequestAllItems(method, resource, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    let link;
    let uri;
    do {
        responseData = await sentryIoApiRequest.call(this, method, resource, body, query, uri, {
            resolveWithFullResponse: true,
        });
        link = responseData.headers.link;
        uri = getNext(link);
        returnData.push.apply(returnData, responseData.body);
        const limit = query.limit;
        if (limit && limit >= returnData.length) {
            return;
        }
    } while (hasMore(link));
    return returnData;
}
//# sourceMappingURL=GenericFunctions.js.map