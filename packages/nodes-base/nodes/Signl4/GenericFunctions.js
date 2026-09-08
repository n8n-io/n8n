import { NodeApiError } from 'n8n-workflow';
/**
 * Make an API request to SIGNL4
 *
 * @param {IHookFunctions | IExecuteFunctions} this
 *
 */
export async function SIGNL4ApiRequest(method, body, query = {}, option = {}) {
    const credentials = await this.getCredentials('signl4Api');
    const teamSecret = credentials?.teamSecret;
    let options = {
        headers: {
            Accept: '*/*',
        },
        method,
        body,
        qs: query,
        uri: `https://connect.signl4.com/webhook/${teamSecret}`,
        json: true,
    };
    if (!Object.keys(body).length) {
        delete options.body;
    }
    if (!Object.keys(query).length) {
        delete options.qs;
    }
    options = Object.assign({}, options, option);
    try {
        return await this.helpers.request(options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
//# sourceMappingURL=GenericFunctions.js.map