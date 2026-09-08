import { NodeApiError } from 'n8n-workflow';
export async function lineApiRequest(method, _resource, body = {}, qs = {}, uri, option = {}) {
    let options = {
        headers: {
            'Content-Type': 'application/json',
        },
        method,
        body,
        qs,
        uri: uri || '',
        json: true,
    };
    options = Object.assign({}, options, option);
    try {
        if (Object.keys(body).length === 0) {
            delete options.body;
        }
        return await this.helpers.requestOAuth2.call(this, 'lineNotifyOAuth2Api', options, {
            tokenType: 'Bearer',
        });
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
//# sourceMappingURL=GenericFunctions.js.map