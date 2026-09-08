import { NodeApiError } from 'n8n-workflow';
/**
 * Make an API request to Message Bird
 *
 */
export async function messageBirdApiRequest(method, resource, body, query = {}) {
    const credentials = await this.getCredentials('messageBirdApi');
    const options = {
        headers: {
            Accept: 'application/json',
            Authorization: `AccessKey ${credentials.accessKey}`,
        },
        method,
        qs: query,
        body,
        uri: `https://rest.messagebird.com${resource}`,
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