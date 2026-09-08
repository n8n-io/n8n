import { NodeApiError } from 'n8n-workflow';
/**
 * Make an authenticated API request to Raindrop.
 */
export async function raindropApiRequest(method, endpoint, qs, body, option = {}) {
    const options = {
        headers: {
            'Content-Type': 'application/json',
        },
        method,
        uri: `https://api.raindrop.io/rest/v1${endpoint}`,
        qs,
        body,
        json: true,
    };
    if (!Object.keys(body).length) {
        delete options.body;
    }
    if (!Object.keys(qs).length) {
        delete options.qs;
    }
    if (Object.keys(option).length !== 0) {
        Object.assign(options, option);
    }
    try {
        return await this.helpers.requestOAuth2.call(this, 'raindropOAuth2Api', options, {
            includeCredentialsOnRefreshOnBody: true,
        });
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
//# sourceMappingURL=GenericFunctions.js.map