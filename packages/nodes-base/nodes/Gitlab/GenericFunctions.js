import { NodeApiError } from 'n8n-workflow';
/**
 * Make an API request to Gitlab
 *
 */
export async function gitlabApiRequest(method, endpoint, body, query, option = {}) {
    const options = {
        method,
        headers: {},
        body,
        qs: query,
        uri: '',
        json: true,
    };
    if (Object.keys(option).length !== 0) {
        Object.assign(options, option);
    }
    if (query === undefined) {
        delete options.qs;
    }
    const authenticationMethod = this.getNodeParameter('authentication', 0);
    try {
        if (authenticationMethod === 'accessToken') {
            const credentials = await this.getCredentials('gitlabApi');
            options.uri = `${credentials.server.replace(/\/$/, '')}/api/v4${endpoint}`;
            return await this.helpers.requestWithAuthentication.call(this, 'gitlabApi', options);
        }
        else {
            const credentials = await this.getCredentials('gitlabOAuth2Api');
            options.uri = `${credentials.server.replace(/\/$/, '')}/api/v4${endpoint}`;
            return await this.helpers.requestOAuth2.call(this, 'gitlabOAuth2Api', options);
        }
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function gitlabApiRequestAllItems(method, endpoint, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    query.per_page = 100;
    query.page = 1;
    do {
        responseData = await gitlabApiRequest.call(this, method, endpoint, body, query, {
            resolveWithFullResponse: true,
        });
        query.page++;
        returnData.push.apply(returnData, responseData.body);
    } while (responseData.headers.link?.includes('next'));
    return returnData;
}
//# sourceMappingURL=GenericFunctions.js.map