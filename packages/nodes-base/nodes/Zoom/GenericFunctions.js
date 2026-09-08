import { sleep } from '@n8n/utils/sleep';
import { NodeApiError } from 'n8n-workflow';
export async function zoomApiRequest(method, resource, body = {}, query = {}, headers = undefined, option = {}) {
    const authenticationMethod = this.getNodeParameter('authentication', 0, 'accessToken');
    let options = {
        method,
        headers: headers || {
            'Content-Type': 'application/json',
        },
        body,
        qs: query,
        uri: `https://api.zoom.us/v2${resource}`,
        json: true,
    };
    options = Object.assign({}, options, option);
    if (Object.keys(body).length === 0) {
        delete options.body;
    }
    if (Object.keys(query).length === 0) {
        delete options.qs;
    }
    try {
        if (authenticationMethod === 'accessToken') {
            return await this.helpers.requestWithAuthentication.call(this, 'zoomApi', options);
        }
        else {
            return await this.helpers.requestOAuth2.call(this, 'zoomOAuth2Api', options);
        }
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function zoomApiRequestAllItems(propertyName, method, endpoint, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    query.page_number = 0;
    do {
        responseData = await zoomApiRequest.call(this, method, endpoint, body, query);
        query.page_number++;
        returnData.push.apply(returnData, responseData[propertyName]);
        // zoom free plan rate limit is 1 request/second
        // TODO just wait when the plan is free
        await sleep(1000);
    } while (responseData.page_count !== responseData.page_number);
    return returnData;
}
//# sourceMappingURL=GenericFunctions.js.map