import { NodeApiError } from 'n8n-workflow';
export async function posthogApiRequest(method, path, body = {}, qs = {}, _option = {}) {
    const credentials = await this.getCredentials('postHogApi');
    const base = credentials.url;
    body.api_key = credentials.apiKey;
    const options = {
        headers: {
            'Content-Type': 'application/json',
        },
        method,
        body,
        qs,
        url: `${base}${path}`,
        json: true,
    };
    try {
        if (Object.keys(body).length === 0) {
            delete options.body;
        }
        return await this.helpers.request(options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
//# sourceMappingURL=GenericFunctions.js.map