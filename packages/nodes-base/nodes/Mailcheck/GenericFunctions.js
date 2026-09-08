import { OperationalError } from 'n8n-workflow';
export async function mailCheckApiRequest(method, resource, body = {}, qs = {}, uri, headers = {}, option = {}) {
    const credentials = await this.getCredentials('mailcheckApi');
    let options = {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${credentials.apiKey}`,
        },
        method,
        body,
        qs,
        uri: uri || `https://api.mailcheck.co/v1${resource}`,
        json: true,
    };
    try {
        options = Object.assign({}, options, option);
        if (Object.keys(headers).length !== 0) {
            options.headers = Object.assign({}, options.headers, headers);
        }
        if (Object.keys(body).length === 0) {
            delete options.body;
        }
        return await this.helpers.request.call(this, options);
    }
    catch (error) {
        if (error.response?.body?.message) {
            // Try to return the error prettier
            throw new OperationalError(`Mailcheck error response [${error.statusCode}]: ${error.response.body.message}`, { level: 'warning' });
        }
        throw error;
    }
}
//# sourceMappingURL=GenericFunctions.js.map