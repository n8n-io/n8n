import { NodeApiError } from 'n8n-workflow';
import { removeTrailingSlash } from '@utils/utilities';
export async function jenkinsApiRequest(method, uri, qs = {}, body = '', option = {}) {
    const credentials = await this.getCredentials('jenkinsApi');
    let options = {
        headers: {
            Accept: 'application/json',
        },
        method,
        auth: {
            username: credentials.username,
            password: credentials.apiKey,
        },
        uri: `${removeTrailingSlash(credentials.baseUrl)}${uri}`,
        json: true,
        qs,
        body,
    };
    options = Object.assign({}, options, option);
    try {
        return await this.helpers.request(options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
//# sourceMappingURL=GenericFunctions.js.map