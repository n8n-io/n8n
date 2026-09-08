import get from 'lodash/get';
import { OperationalError } from 'n8n-workflow';
export async function venafiApiRequest(method, resource, body = {}, qs = {}, uri, headers = {}) {
    const credentials = await this.getCredentials('venafiTlsProtectDatacenterApi');
    const options = {
        headers: {
            'Content-Type': 'application/json',
        },
        method,
        body,
        qs,
        rejectUnauthorized: !credentials.allowUnauthorizedCerts,
        uri: uri || `${credentials.domain}${resource}`,
        json: true,
    };
    try {
        if (Object.keys(headers).length !== 0) {
            options.headers = Object.assign({}, options.headers, headers);
        }
        if (Object.keys(body).length === 0) {
            delete options.body;
        }
        return await this.helpers.requestWithAuthentication.call(this, 'venafiTlsProtectDatacenterApi', options);
    }
    catch (error) {
        if (error.response?.body?.error) {
            let errors = error.response.body.error.errors;
            errors = errors.map((e) => e.message);
            // Try to return the error prettier
            throw new OperationalError(`Venafi error response [${error.statusCode}]: ${errors.join('|')}`, { level: 'warning' });
        }
        throw error;
    }
}
export async function venafiApiRequestAllItems(propertyName, method, endpoint, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    do {
        responseData = await venafiApiRequest.call(this, method, endpoint, body, query);
        endpoint = get(responseData, '_links[0].Next');
        returnData.push.apply(returnData, responseData[propertyName]);
    } while (responseData._links?.[0].Next);
    return returnData;
}
//# sourceMappingURL=GenericFunctions.js.map