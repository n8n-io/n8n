import { NodeApiError } from 'n8n-workflow';
export async function netlifyApiRequest(method, endpoint, body = {}, query = {}, uri, option = {}) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
        qs: query,
        body,
        uri: uri || `https://api.netlify.com/api/v1${endpoint}`,
        json: true,
    };
    if (!Object.keys(body).length) {
        delete options.body;
    }
    if (Object.keys(option)) {
        Object.assign(options, option);
    }
    try {
        const credentials = await this.getCredentials('netlifyApi');
        options.headers.Authorization = `Bearer ${credentials.accessToken}`;
        return await this.helpers.request(options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function netlifyRequestAllItems(method, endpoint, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    query.page = 0;
    query.per_page = 100;
    do {
        responseData = await netlifyApiRequest.call(this, method, endpoint, body, query, undefined, {
            resolveWithFullResponse: true,
        });
        query.page++;
        returnData.push.apply(returnData, responseData.body);
    } while (responseData.headers.link.includes('next'));
    return returnData;
}
//# sourceMappingURL=GenericFunctions.js.map