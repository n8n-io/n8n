import { NodeApiError } from 'n8n-workflow';
export async function vonageApiRequest(method, path, body = {}, qs = {}, _option = {}) {
    const credentials = await this.getCredentials('vonageApi');
    body.api_key = credentials.apiKey;
    body.api_secret = credentials.apiSecret;
    const options = {
        method,
        form: body,
        qs,
        uri: `https://rest.nexmo.com${path}`,
        json: true,
    };
    try {
        if (Object.keys(body).length === 0) {
            delete options.body;
        }
        return await this.helpers.request.call(this, options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
//# sourceMappingURL=GenericFunctions.js.map