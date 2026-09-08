function getUri(resource, subdomain) {
    if (resource.includes('webhooks')) {
        return `https://${subdomain}.zendesk.com/api/v2${resource}`;
    }
    else {
        return `https://${subdomain}.zendesk.com/api/v2${resource}.json`;
    }
}
export async function zendeskApiRequest(method, resource, body = {}, qs = {}, uri, option = {}) {
    const authenticationMethod = this.getNodeParameter('authentication', 0);
    let credentials;
    if (authenticationMethod === 'apiToken') {
        credentials = await this.getCredentials('zendeskApi');
    }
    else {
        credentials = await this.getCredentials('zendeskOAuth2Api');
    }
    let options = {
        method,
        qs,
        body,
        uri: uri || getUri(resource, credentials.subdomain),
        json: true,
        qsStringifyOptions: {
            arrayFormat: 'brackets',
        },
    };
    options = Object.assign({}, options, option);
    if (Object.keys(options.body).length === 0) {
        delete options.body;
    }
    const credentialType = authenticationMethod === 'apiToken' ? 'zendeskApi' : 'zendeskOAuth2Api';
    return await this.helpers.requestWithAuthentication.call(this, credentialType, options);
}
/**
 * Make an API request to paginated flow endpoint
 * and return all results
 */
export async function zendeskApiRequestAllItems(propertyName, method, resource, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    let uri;
    do {
        responseData = await zendeskApiRequest.call(this, method, resource, body, query, uri);
        uri = responseData.next_page;
        returnData.push.apply(returnData, responseData[propertyName]);
        const limit = query.limit;
        if (limit && limit <= returnData.length) {
            return returnData;
        }
    } while (responseData.next_page !== undefined && responseData.next_page !== null);
    return returnData;
}
export function validateJSON(json) {
    let result;
    try {
        result = JSON.parse(json);
    }
    catch (exception) {
        result = undefined;
    }
    return result;
}
//# sourceMappingURL=GenericFunctions.js.map