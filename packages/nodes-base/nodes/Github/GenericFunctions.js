import { NodeApiError, NodeOperationError } from 'n8n-workflow';
/**
 * Make an API request to Github
 *
 */
export async function githubApiRequest(method, endpoint, body, query, option = {}) {
    const options = {
        method,
        body,
        qs: query,
        uri: '',
        json: true,
    };
    if (Object.keys(option).length !== 0) {
        Object.assign(options, option);
    }
    try {
        const authenticationMethod = this.getNodeParameter('authentication', 0, 'accessToken');
        let credentialType = '';
        if (authenticationMethod === 'accessToken') {
            const credentials = await this.getCredentials('githubApi');
            credentialType = 'githubApi';
            const baseUrl = credentials.server || 'https://api.github.com';
            options.uri = `${baseUrl}${endpoint}`;
        }
        else if (authenticationMethod === 'githubAppApi') {
            const credentials = await this.getCredentials('githubAppApi');
            credentialType = 'githubAppApi';
            const baseUrl = credentials.server || 'https://api.github.com';
            options.uri = `${baseUrl}${endpoint}`;
        }
        else {
            const credentials = await this.getCredentials('githubOAuth2Api');
            credentialType = 'githubOAuth2Api';
            const baseUrl = credentials.server || 'https://api.github.com';
            options.uri = `${baseUrl}${endpoint}`;
        }
        return await this.helpers.requestWithAuthentication.call(this, credentialType, options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
/**
 * Returns the SHA of the given file
 *
 * @param {(IHookFunctions | IExecuteFunctions)} this
 */
export async function getFileSha(owner, repository, filePath, branch) {
    const query = {};
    if (branch !== undefined) {
        query.ref = branch;
    }
    const getEndpoint = `/repos/${owner}/${repository}/contents/${encodeURI(filePath)}`;
    const responseData = await githubApiRequest.call(this, 'GET', getEndpoint, {}, query);
    if (responseData.sha === undefined) {
        throw new NodeOperationError(this.getNode(), 'Could not get the SHA of the file.');
    }
    return responseData.sha;
}
export async function githubApiRequestAllItems(method, endpoint, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    query.per_page = 100;
    query.page = 1;
    do {
        responseData = await githubApiRequest.call(this, method, endpoint, body, query, {
            resolveWithFullResponse: true,
        });
        query.page++;
        returnData.push.apply(returnData, responseData.body);
    } while (responseData.headers.link?.includes('next'));
    return returnData;
}
export function isBase64(content) {
    const base64regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
    return base64regex.test(content);
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