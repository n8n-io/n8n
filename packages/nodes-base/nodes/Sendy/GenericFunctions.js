import { NodeApiError } from 'n8n-workflow';
export async function sendyApiRequest(method, path, body = {}, qs = {}, _option = {}) {
    const credentials = await this.getCredentials('sendyApi');
    body.api_key = credentials.apiKey;
    body.boolean = true;
    const options = {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        method,
        form: body,
        qs,
        uri: `${credentials.url}${path}`,
    };
    try {
        return await this.helpers.request.call(this, options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
//# sourceMappingURL=GenericFunctions.js.map