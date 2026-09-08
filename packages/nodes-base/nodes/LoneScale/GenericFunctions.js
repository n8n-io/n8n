import { OperationalError, } from 'n8n-workflow';
import { BASE_URL } from './constants';
export async function lonescaleApiRequest(method, resource, body = {}, query = {}, uri) {
    const endpoint = `${BASE_URL}`;
    const credentials = await this.getCredentials('loneScaleApi');
    const options = {
        headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': credentials?.apiKey,
        },
        method,
        body,
        qs: query,
        uri: uri || `${endpoint}${resource}`,
        json: true,
    };
    if (!Object.keys(body).length) {
        delete options.body;
    }
    if (!Object.keys(query).length) {
        delete options.qs;
    }
    try {
        return await this.helpers.requestWithAuthentication.call(this, 'loneScaleApi', options);
    }
    catch (error) {
        if (error.response) {
            const errorMessage = error.response.body.message || error.response.body.description || error.message;
            throw new OperationalError(`Autopilot error response [${error.statusCode}]: ${errorMessage}`, { level: 'warning' });
        }
        throw error;
    }
}
//# sourceMappingURL=GenericFunctions.js.map