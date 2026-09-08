import get from 'lodash/get';
import { NodeApiError } from 'n8n-workflow';
export async function travisciApiRequest(method, resource, body = {}, qs = {}, uri, option = {}) {
    const credentials = await this.getCredentials('travisCiApi');
    let options = {
        headers: {
            'Travis-API-Version': '3',
            Accept: 'application/json',
            'Content-Type': 'application.json',
            Authorization: `token ${credentials.apiToken}`,
        },
        method,
        qs,
        body,
        uri: uri || `https://api.travis-ci.com${resource}`,
        json: true,
    };
    options = Object.assign({}, options, option);
    if (Object.keys(options.body).length === 0) {
        delete options.body;
    }
    try {
        return await this.helpers.request(options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
/**
 * Make an API request to paginated TravisCI endpoint
 * and return all results
 */
export async function travisciApiRequestAllItems(propertyName, method, resource, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    do {
        responseData = await travisciApiRequest.call(this, method, resource, body, query);
        const path = get(responseData, '@pagination.next.@href');
        if (path !== undefined) {
            const parsedPath = new URLSearchParams(path);
            query = Object.fromEntries(parsedPath);
        }
        returnData.push.apply(returnData, responseData[propertyName]);
    } while (responseData['@pagination'].is_last !== true);
    return returnData;
}
//# sourceMappingURL=GenericFunctions.js.map