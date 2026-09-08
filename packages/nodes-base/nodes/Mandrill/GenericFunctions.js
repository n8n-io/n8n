import map from 'lodash/map';
import { NodeApiError } from 'n8n-workflow';
export async function mandrillApiRequest(resource, method, action, body = {}, headers) {
    const credentials = await this.getCredentials('mandrillApi');
    const data = Object.assign({}, body, { key: credentials.apiKey });
    const endpoint = 'mandrillapp.com/api/1.0';
    const options = {
        headers,
        method,
        uri: `https://${endpoint}${resource}${action}.json`,
        body: data,
        json: true,
    };
    try {
        return await this.helpers.request(options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export function getToEmailArray(toEmail) {
    let toEmailArray;
    if (toEmail.split(',').length > 0) {
        const array = toEmail.split(',');
        toEmailArray = map(array, (email) => {
            return {
                email,
                type: 'to',
            };
        });
    }
    else {
        toEmailArray = [
            {
                email: toEmail,
                type: 'to',
            },
        ];
    }
    return toEmailArray;
}
export function getGoogleAnalyticsDomainsArray(s) {
    let array = [];
    if (s.split(',').length > 0) {
        array = s.split(',');
    }
    else {
        array = [s];
    }
    return array;
}
export function getTags(s) {
    let array = [];
    if (s.split(',').length > 0) {
        array = s.split(',');
    }
    else {
        array = [s];
    }
    return array;
}
export function validateJSON(json) {
    let result;
    try {
        result = JSON.parse(json);
    }
    catch (exception) {
        result = [];
    }
    return result;
}
//# sourceMappingURL=GenericFunctions.js.map