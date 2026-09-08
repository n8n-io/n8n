import { NodeApiError } from 'n8n-workflow';
export async function googleApiRequest(projectId, method, resource, body = {}, qs = {}, headers = {}, uri = null) {
    const { region } = await this.getCredentials('googleFirebaseRealtimeDatabaseOAuth2Api');
    const options = {
        headers: {
            'Content-Type': 'application/json',
        },
        method,
        body,
        qs,
        url: uri || `https://${projectId}.${region}/${resource}.json`,
        json: true,
    };
    try {
        if (Object.keys(headers).length !== 0) {
            options.headers = Object.assign({}, options.headers, headers);
        }
        if (Object.keys(body).length === 0) {
            delete options.body;
        }
        return await this.helpers.requestOAuth2.call(this, 'googleFirebaseRealtimeDatabaseOAuth2Api', options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function googleApiRequestAllItems(projectId, method, resource, body = {}, qs = {}, _headers = {}, uri = null) {
    const returnData = [];
    let responseData;
    qs.pageSize = 100;
    do {
        responseData = await googleApiRequest.call(this, projectId, method, resource, body, qs, {}, uri);
        qs.pageToken = responseData.nextPageToken;
        returnData.push.apply(returnData, responseData[resource]);
    } while (responseData.nextPageToken !== undefined && responseData.nextPageToken !== '');
    return returnData;
}
//# sourceMappingURL=GenericFunctions.js.map