import { NodeApiError } from 'n8n-workflow';
export async function oneSimpleApiRequest(method, resource, body = {}, qs = {}, uri, option = {}) {
    const credentials = await this.getCredentials('oneSimpleApi');
    const outputFormat = 'json';
    let options = {
        method,
        body,
        qs,
        uri: uri ||
            `https://onesimpleapi.com/api${resource}?token=${credentials.apiToken}&output=${outputFormat}`,
        json: true,
    };
    options = Object.assign({}, options, option);
    if (Object.keys(body).length === 0) {
        delete options.body;
    }
    try {
        const responseData = await this.helpers.request(options);
        return responseData;
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
//# sourceMappingURL=GenericFunctions.js.map