import { NodeApiError } from 'n8n-workflow';
/**
 * Make an authenticated or unauthenticated API request to Reddit.
 */
export async function redditApiRequest(method, endpoint, qs) {
    const resource = this.getNodeParameter('resource', 0);
    const authRequired = ['profile', 'post', 'postComment'].includes(resource);
    qs.api_type = 'json';
    const options = {
        method,
        uri: authRequired
            ? `https://oauth.reddit.com/${endpoint}`
            : `https://www.reddit.com/${endpoint}`,
        qs,
        json: true,
    };
    if (!Object.keys(qs).length) {
        delete options.qs;
    }
    if (authRequired) {
        try {
            return await this.helpers.requestOAuth2.call(this, 'redditOAuth2Api', options);
        }
        catch (error) {
            throw new NodeApiError(this.getNode(), error);
        }
    }
    else {
        try {
            return await this.helpers.request.call(this, options);
        }
        catch (error) {
            throw new NodeApiError(this.getNode(), error);
        }
    }
}
/**
 * Make an unauthenticated API request to Reddit and return all results.
 */
export async function redditApiRequestAllItems(method, endpoint, qs) {
    let responseData;
    const returnData = [];
    const resource = this.getNodeParameter('resource', 0);
    const operation = this.getNodeParameter('operation', 0);
    const returnAll = this.getNodeParameter('returnAll', 0, false);
    qs.limit = 100;
    do {
        responseData = await redditApiRequest.call(this, method, endpoint, qs);
        if (!Array.isArray(responseData)) {
            qs.after = responseData.data.after;
        }
        if (endpoint === 'api/search_subreddits.json') {
            responseData.subreddits.forEach((child) => returnData.push(child));
        }
        else if (resource === 'postComment' && operation === 'getAll') {
            responseData[1].data.children.forEach((child) => returnData.push(child.data));
        }
        else {
            responseData.data.children.forEach((child) => returnData.push(child.data));
        }
        if (qs.limit && returnData.length >= qs.limit && !returnAll) {
            return returnData;
        }
    } while (responseData.data?.after);
    return returnData;
}
/**
 * Handles a large Reddit listing by returning all items or up to a limit.
 */
export async function handleListing(i, endpoint, qs = {}, requestMethod = 'GET') {
    let responseData;
    const returnAll = this.getNodeParameter('returnAll', i);
    if (returnAll) {
        responseData = await redditApiRequestAllItems.call(this, requestMethod, endpoint, qs);
    }
    else {
        const limit = this.getNodeParameter('limit', i);
        qs.limit = limit;
        responseData = await redditApiRequestAllItems.call(this, requestMethod, endpoint, qs);
        responseData = responseData.slice(0, limit);
    }
    return responseData;
}
//# sourceMappingURL=GenericFunctions.js.map