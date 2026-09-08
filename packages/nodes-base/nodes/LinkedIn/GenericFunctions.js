import { NodeApiError } from 'n8n-workflow';
function resolveHeaderData(fullResponse) {
    if (fullResponse.statusCode === 201) {
        return { urn: fullResponse.headers['x-restli-id'] };
    }
    else {
        return fullResponse.body;
    }
}
export async function linkedInApiRequest(method, endpoint, body = {}, binary, _headers) {
    const authenticationMethod = this.getNodeParameter('authentication', 0);
    const credentialType = authenticationMethod === 'standard'
        ? 'linkedInOAuth2Api'
        : 'linkedInCommunityManagementOAuth2Api';
    const baseUrl = 'https://api.linkedin.com';
    let options = {
        headers: {
            Accept: 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
            'LinkedIn-Version': '202604',
        },
        method,
        body,
        url: binary ? endpoint : `${baseUrl}${endpoint.includes('v2') ? '' : '/rest'}${endpoint}`,
        json: true,
    };
    options = Object.assign({}, options, {
        resolveWithFullResponse: true,
    });
    // If uploading binary data
    if (binary) {
        delete options.json;
        options.encoding = null;
        if (Object.keys(_headers).length > 0) {
            Object.assign(options.headers, _headers);
        }
    }
    if (Object.keys(body).length === 0) {
        delete options.body;
    }
    try {
        return resolveHeaderData(await this.helpers.requestOAuth2.call(this, credentialType, options, {
            tokenType: 'Bearer',
        }));
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export function validateJSON(json) {
    let result;
    try {
        result = JSON.parse(json);
    }
    catch (exception) {
        result = '';
    }
    return result;
}
//# sourceMappingURL=GenericFunctions.js.map