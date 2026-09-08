import { NodeApiError } from 'n8n-workflow';
export async function googleApiRequest(method, resource, body = {}, qs = {}, uri, option = {}) {
    let options = {
        headers: {
            'Content-Type': 'application/json',
        },
        method,
        body,
        qs,
        uri: uri || `https://www.googleapis.com${resource}`,
        json: true,
    };
    try {
        options = Object.assign({}, options, option);
        if (Object.keys(body).length === 0) {
            delete options.body;
        }
        return await this.helpers.requestOAuth2.call(this, 'youTubeOAuth2Api', options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function googleApiRequestAllItems(propertyName, method, endpoint, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    query.maxResults = 100;
    do {
        responseData = await googleApiRequest.call(this, method, endpoint, body, query);
        query.pageToken = responseData.nextPageToken;
        returnData.push.apply(returnData, responseData[propertyName]);
    } while (responseData.nextPageToken !== undefined && responseData.nextPageToken !== '');
    return returnData;
}
//# sourceMappingURL=GenericFunctions.js.map