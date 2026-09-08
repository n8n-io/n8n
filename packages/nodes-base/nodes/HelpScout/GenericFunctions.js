import get from 'lodash/get';
import { NodeApiError } from 'n8n-workflow';
export async function helpscoutApiRequest(method, resource, body = {}, qs = {}, uri, option = {}) {
    let options = {
        headers: {
            'Content-Type': 'application/json',
        },
        method,
        body,
        qs,
        uri: uri || `https://api.helpscout.net${resource}`,
        json: true,
    };
    try {
        if (Object.keys(option).length !== 0) {
            options = Object.assign({}, options, option);
        }
        if (Object.keys(body).length === 0) {
            delete options.body;
        }
        return await this.helpers.requestOAuth2.call(this, 'helpScoutOAuth2Api', options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function helpscoutApiRequestAllItems(propertyName, method, endpoint, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    let uri = undefined;
    do {
        responseData = await helpscoutApiRequest.call(this, method, endpoint, body, query, uri);
        uri = get(responseData, '_links.next.href');
        returnData.push.apply(returnData, get(responseData, propertyName));
        const limit = query.limit;
        if (limit && limit <= returnData.length) {
            return returnData;
        }
    } while (responseData._links?.next?.href !== undefined);
    return returnData;
}
//# sourceMappingURL=GenericFunctions.js.map