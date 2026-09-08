import { NodeApiError } from 'n8n-workflow';
import { getGoogleAccessToken } from '../../../GenericFunctions';
export async function googleApiRequest(method, resource, body = {}, qs = {}, uri, option = {}) {
    const authenticationMethod = this.getNodeParameter('authentication', 0, 'serviceAccount');
    let options = {
        headers: {
            'Content-Type': 'application/json',
        },
        method,
        body,
        qs,
        url: uri || `https://www.googleapis.com${resource}`,
        json: true,
    };
    options = Object.assign({}, options, option);
    try {
        if (Object.keys(body).length === 0) {
            delete options.body;
        }
        if (authenticationMethod === 'serviceAccount') {
            const credentials = await this.getCredentials('googleApi');
            const { access_token } = await getGoogleAccessToken.call(this, credentials, 'drive');
            options.headers.Authorization = `Bearer ${access_token}`;
            return await this.helpers.httpRequest(options);
        }
        else {
            return await this.helpers.httpRequestWithAuthentication.call(this, 'googleDriveOAuth2Api', options);
        }
    }
    catch (error) {
        if (error.code === 'ERR_OSSL_PEM_NO_START_LINE') {
            error.statusCode = '401';
        }
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function googleApiRequestAllItems(method, propertyName, endpoint, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    query.maxResults = query.maxResults || 100;
    query.pageSize = query.pageSize || 100;
    do {
        responseData = await googleApiRequest.call(this, method, endpoint, body, query);
        returnData.push.apply(returnData, responseData[propertyName]);
        if (responseData.nextPageToken) {
            query.pageToken = responseData.nextPageToken;
        }
    } while (responseData.nextPageToken !== undefined && responseData.nextPageToken !== '');
    return returnData;
}
//# sourceMappingURL=index.js.map