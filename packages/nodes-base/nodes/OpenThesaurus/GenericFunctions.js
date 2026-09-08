import { NodeApiError } from 'n8n-workflow';
export async function openThesaurusApiRequest(method, resource, body = {}, qs = {}, uri, option = {}) {
    try {
        let options = {
            headers: {
                'User-Agent': 'https://n8n.io',
            },
            method,
            qs,
            body,
            uri: uri || `https://www.openthesaurus.de${resource}`,
            json: true,
        };
        options = Object.assign({}, options, option);
        options.qs.format = 'application/json';
        return await this.helpers.request(options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
//# sourceMappingURL=GenericFunctions.js.map