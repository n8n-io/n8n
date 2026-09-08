export async function mailjetApiRequest(method, path, body = {}, qs = {}, uri, option = {}) {
    const resource = this.getNodeParameter('resource', 0);
    let credentialType;
    if (resource === 'email' || this.getNode().type.includes('Trigger')) {
        credentialType = 'mailjetEmailApi';
        const { sandboxMode } = await this.getCredentials('mailjetEmailApi');
        if (!this.getNode().type.includes('Trigger')) {
            Object.assign(body, { SandboxMode: sandboxMode });
        }
    }
    else {
        credentialType = 'mailjetSmsApi';
    }
    let options = {
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        method,
        qs,
        body,
        uri: uri || `https://api.mailjet.com${path}`,
        json: true,
    };
    options = Object.assign({}, options, option);
    if (Object.keys(options.body).length === 0) {
        delete options.body;
    }
    return await this.helpers.requestWithAuthentication.call(this, credentialType, options);
}
export async function mailjetApiRequestAllItems(method, endpoint, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    query.Limit = 1000;
    query.Offset = 0;
    do {
        responseData = await mailjetApiRequest.call(this, method, endpoint, body, query, undefined, {
            resolveWithFullResponse: true,
        });
        returnData.push.apply(returnData, responseData.body);
        query.Offset = query.Offset + query.Limit;
    } while (responseData.length !== 0);
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