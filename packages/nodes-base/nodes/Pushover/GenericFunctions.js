import { NodeApiError } from 'n8n-workflow';
export async function pushoverApiRequest(method, path, body = {}, qs = {}, _option = {}) {
    const options = {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
        method,
        body,
        qs,
        url: `https://api.pushover.net/1${path}`,
        json: true,
    };
    try {
        if (Object.keys(body).length === 0) {
            delete options.body;
        }
        return await this.helpers.requestWithAuthentication.call(this, 'pushoverApi', options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
//# sourceMappingURL=GenericFunctions.js.map