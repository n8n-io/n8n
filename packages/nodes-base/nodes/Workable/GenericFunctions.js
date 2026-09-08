import { NodeApiError } from 'n8n-workflow';
export async function workableApiRequest(method, resource, body = {}, qs = {}, uri, option = {}) {
    const credentials = await this.getCredentials('workableApi');
    let options = {
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
        method,
        qs,
        body,
        uri: uri || `https://${credentials.subdomain}.workable.com/spi/v3${resource}`,
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