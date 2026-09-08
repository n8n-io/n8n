import { NodeApiError } from 'n8n-workflow';
/**
 * Method will call register or list webhooks based on the passed method in the parameter
 */
export async function formIoApiRequest(method, endpoint, body = {}, qs = {}) {
    const credentials = await this.getCredentials('formIoApi');
    const base = credentials.domain || 'https://api.form.io';
    const options = {
        headers: {
            'Content-Type': 'application/json',
        },
        method,
        body,
        qs,
        url: `${base}${endpoint}`,
        json: true,
    };
    try {
        return await this.helpers.httpRequestWithAuthentication.call(this, 'formIoApi', options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
//# sourceMappingURL=GenericFunctions.js.map