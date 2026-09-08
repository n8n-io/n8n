import { NodeApiError } from 'n8n-workflow';
export async function twistApiRequest(method, endpoint, body = {}, qs = {}, option = {}) {
    const options = {
        method,
        body,
        qs,
        uri: `https://api.twist.com/api/v3${endpoint}`,
        json: true,
    };
    if (Object.keys(body).length === 0) {
        delete options.body;
    }
    if (Object.keys(qs).length === 0) {
        delete options.qs;
    }
    Object.assign(options, option);
    try {
        return await this.helpers.requestOAuth2.call(this, 'twistOAuth2Api', options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
//# sourceMappingURL=GenericFunctions.js.map