import { NodeApiError } from 'n8n-workflow';
export async function humanticAiApiRequest(method, resource, body = {}, qs = {}, option = {}) {
    try {
        const credentials = await this.getCredentials('humanticAiApi');
        let options = {
            headers: {
                'Content-Type': 'application/json',
            },
            method,
            qs,
            body,
            uri: `https://api.humantic.ai/v1${resource}`,
            json: true,
        };
        options = Object.assign({}, options, option);
        options.qs.apikey = credentials.apiKey;
        if (Object.keys(options.body).length === 0) {
            delete options.body;
        }
        const response = await this.helpers.request(options);
        if (response.data && response.data.status === 'error') {
            throw new NodeApiError(this.getNode(), response.data);
        }
        return response;
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
//# sourceMappingURL=GenericFunctions.js.map