import { NodeApiError } from 'n8n-workflow';
export async function upleadApiRequest(method, resource, body = {}, qs = {}, uri, option = {}) {
    const credentials = await this.getCredentials('upleadApi');
    let options = {
        headers: { Authorization: credentials.apiKey },
        method,
        qs,
        body,
        uri: uri || `https://api.uplead.com/v2${resource}`,
        json: true,
    };
    options = Object.assign({}, options, option);
    if (Object.keys(options.body).length === 0) {
        delete options.body;
    }
    try {
        return await this.helpers.request(options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
//# sourceMappingURL=GenericFunctions.js.map