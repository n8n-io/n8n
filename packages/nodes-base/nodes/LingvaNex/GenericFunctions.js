import { NodeApiError } from 'n8n-workflow';
export async function lingvaNexApiRequest(method, resource, body = {}, qs = {}, uri, option = {}) {
    try {
        const credentials = await this.getCredentials('lingvaNexApi');
        let options = {
            headers: {
                Authorization: `Bearer ${credentials.apiKey}`,
            },
            method,
            qs,
            body,
            uri: uri || `https://api-b2b.backenster.com/b1/api/v3${resource}`,
            json: true,
        };
        options = Object.assign({}, options, option);
        const response = await this.helpers.request(options);
        if (response.err !== null) {
            throw new NodeApiError(this.getNode(), response);
        }
        return response;
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
//# sourceMappingURL=GenericFunctions.js.map