import { NodeApiError } from 'n8n-workflow';
export async function ouraApiRequest(method, resource, body = {}, qs = {}, uri, option = {}) {
    let options = {
        method,
        qs,
        body,
        url: uri ?? `https://api.ouraring.com/v2${resource}`,
        json: true,
    };
    if (!Object.keys(body).length) {
        delete options.body;
    }
    if (!Object.keys(qs).length) {
        delete options.qs;
    }
    options = Object.assign({}, options, option);
    try {
        return await this.helpers.httpRequestWithAuthentication.call(this, 'ouraApi', options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
//# sourceMappingURL=GenericFunctions.js.map