import { NodeApiError, NodeOperationError } from 'n8n-workflow';
export async function uptimeRobotApiRequest(method, resource, body = {}, qs = {}, uri, option = {}) {
    const credentials = await this.getCredentials('uptimeRobotApi');
    let options = {
        method,
        qs,
        form: {
            api_key: credentials.apiKey,
            ...body,
        },
        uri: uri || `https://api.uptimerobot.com/v2${resource}`,
        json: true,
    };
    options = Object.assign({}, options, option);
    try {
        const responseData = await this.helpers.request(options);
        if (responseData.stat !== 'ok') {
            throw new NodeOperationError(this.getNode(), responseData);
        }
        return responseData;
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
//# sourceMappingURL=GenericFunctions.js.map