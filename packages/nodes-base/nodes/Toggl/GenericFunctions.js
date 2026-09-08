import { NodeApiError } from 'n8n-workflow';
export async function togglApiRequest(method, resource, body = {}, query, uri) {
    const options = {
        method,
        qs: query,
        uri: uri || `https://api.track.toggl.com/api/v9/me${resource}`,
        body,
        json: true,
    };
    if (Object.keys(options.body).length === 0) {
        delete options.body;
    }
    try {
        return await this.helpers.requestWithAuthentication.call(this, 'togglApi', options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
//# sourceMappingURL=GenericFunctions.js.map