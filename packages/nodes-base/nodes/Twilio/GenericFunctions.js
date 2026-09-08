/**
 * Make an API request to Twilio
 *
 */
export async function twilioApiRequest(method, endpoint, body, query) {
    const credentials = await this.getCredentials('twilioApi');
    if (query === undefined) {
        query = {};
    }
    const options = {
        method,
        form: body,
        qs: query,
        uri: `https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}${endpoint}`,
        json: true,
    };
    return await this.helpers.requestWithAuthentication.call(this, 'twilioApi', options);
}
export async function twilioTriggerApiRequest(method, endpoint, body = {}) {
    const options = {
        method,
        body,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        url: `https://events.twilio.com/v1/${endpoint}`,
        json: true,
    };
    return await this.helpers.requestWithAuthentication.call(this, 'twilioApi', options);
}
const XML_CHAR_MAP = {
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;',
    "'": '&apos;',
};
export function escapeXml(str) {
    return str.replace(/[<>&"']/g, (ch) => {
        return XML_CHAR_MAP[ch];
    });
}
//# sourceMappingURL=GenericFunctions.js.map