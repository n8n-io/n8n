import { NodeApiError } from 'n8n-workflow';
export async function pushcutApiRequest(method, path, body = {}, qs = {}, uri, option = {}) {
    const credentials = await this.getCredentials('pushcutApi');
    const options = {
        headers: {
            'API-Key': credentials.apiKey,
        },
        method,
        body,
        qs,
        uri: uri || `https://api.pushcut.io/v1${path}`,
        json: true,
    };
    try {
        if (Object.keys(body).length === 0) {
            delete options.body;
        }
        if (Object.keys(option).length !== 0) {
            Object.assign(options, option);
        }
        return await this.helpers.request.call(this, options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
//# sourceMappingURL=GenericFunctions.js.map