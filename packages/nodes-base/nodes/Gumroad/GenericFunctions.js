import { NodeApiError } from 'n8n-workflow';
export async function gumroadApiRequest(method, resource, body = {}, qs = {}, uri, option = {}) {
    const authenticationMethod = this.getNodeParameter('authentication', 0, 'accessToken');
    const credentialType = authenticationMethod === 'oAuth2' ? 'gumroadOAuth2Api' : 'gumroadApi';
    let options = {
        method,
        qs,
        body,
        url: uri || `https://api.gumroad.com/v2${resource}`,
        json: true,
    };
    options = Object.assign({}, options, option);
    if (Object.keys(options.body).length === 0) {
        delete options.body;
    }
    try {
        return await this.helpers.httpRequestWithAuthentication.call(this, credentialType, options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
//# sourceMappingURL=GenericFunctions.js.map