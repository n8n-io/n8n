import { NodeApiError } from 'n8n-workflow';
import { getGoogleAccessToken } from '../GenericFunctions';
export async function googleApiRequest(method, endpoint, body = {}, qs, uri) {
    const authenticationMethod = this.getNodeParameter('authentication', 0, 'serviceAccount');
    const options = {
        headers: {
            'Content-Type': 'application/json',
        },
        method,
        body,
        qs,
        uri: uri || `https://docs.googleapis.com/v1${endpoint}`,
        json: true,
    };
    if (!Object.keys(body).length) {
        delete options.body;
    }
    try {
        if (authenticationMethod === 'serviceAccount') {
            const credentials = await this.getCredentials('googleApi');
            const { access_token } = await getGoogleAccessToken.call(this, credentials, 'docs');
            options.headers.Authorization = `Bearer ${access_token}`;
            return await this.helpers.request(options);
        }
        else {
            return await this.helpers.requestOAuth2.call(this, 'googleDocsOAuth2Api', options);
        }
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function googleApiRequestAllItems(propertyName, method, endpoint, body = {}, qs, uri) {
    const returnData = [];
    let responseData;
    const query = { ...qs };
    query.maxResults = 100;
    query.pageSize = 100;
    do {
        responseData = await googleApiRequest.call(this, method, endpoint, body, query, uri);
        query.pageToken = responseData.nextPageToken;
        returnData.push.apply(returnData, responseData[propertyName]);
    } while (responseData.nextPageToken !== undefined && responseData.nextPageToken !== '');
    return returnData;
}
export const hasKeys = (obj = {}) => Object.keys(obj).length > 0;
export const extractID = (url) => {
    const regex = new RegExp('https://docs.google.com/document/d/([a-zA-Z0-9-_]+)/');
    const results = regex.exec(url);
    return results ? results[1] : undefined;
};
export const upperFirst = (str) => {
    return str[0].toUpperCase() + str.substr(1);
};
//# sourceMappingURL=GenericFunctions.js.map