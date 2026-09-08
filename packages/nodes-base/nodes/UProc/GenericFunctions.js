import { NodeApiError } from 'n8n-workflow';
export async function uprocApiRequest(method, body = {}, qs = {}, _option = {}) {
    const options = {
        method,
        qs,
        body,
        url: 'https://api.uproc.io/api/v2/process',
        json: true,
    };
    try {
        return await this.helpers.httpRequestWithAuthentication.call(this, 'uprocApi', options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
//# sourceMappingURL=GenericFunctions.js.map