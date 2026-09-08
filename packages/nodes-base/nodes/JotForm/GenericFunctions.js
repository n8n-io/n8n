import { NodeApiError } from 'n8n-workflow';
export async function jotformApiRequest(method, resource, body = {}, qs = {}, uri, option = {}) {
    const credentials = await this.getCredentials('jotFormApi');
    let options = {
        headers: {
            APIKEY: credentials.apiKey,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        method,
        qs,
        form: body,
        uri: uri || `https://${credentials.apiDomain || 'api.jotform.com'}${resource}`,
        json: true,
    };
    if (!Object.keys(body).length) {
        delete options.form;
    }
    options = Object.assign({}, options, option);
    try {
        return await this.helpers.request(options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
//# sourceMappingURL=GenericFunctions.js.map