import { NodeApiError } from 'n8n-workflow';
import { getGoogleAccessToken } from '../../GenericFunctions';
export async function googleApiRequest(method, resource, body = {}, qs = {}, uri, headers = {}) {
    const authenticationMethod = this.getNodeParameter('authentication', 0, 'serviceAccount');
    const options = {
        headers: {
            'Content-Type': 'application/json',
        },
        method,
        body,
        qs,
        uri: uri || `https://sheets.googleapis.com${resource}`,
        json: true,
    };
    try {
        if (Object.keys(headers).length !== 0) {
            options.headers = Object.assign({}, options.headers, headers);
        }
        if (Object.keys(body).length === 0) {
            delete options.body;
        }
        if (authenticationMethod === 'serviceAccount') {
            const credentials = await this.getCredentials('googleApi');
            const { access_token } = await getGoogleAccessToken.call(this, credentials, 'sheetV1');
            options.headers.Authorization = `Bearer ${access_token}`;
            return await this.helpers.request(options);
        }
        else {
            return await this.helpers.requestOAuth2.call(this, 'googleSheetsOAuth2Api', options);
        }
    }
    catch (error) {
        if (error.code === 'ERR_OSSL_PEM_NO_START_LINE') {
            error.statusCode = '401';
        }
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
// Hex to RGB
export function hexToRgb(hex) {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (_, r, g, b) => {
        return r + r + g + g + b + b;
    });
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
        return {
            red: parseInt(result[1], 16),
            green: parseInt(result[2], 16),
            blue: parseInt(result[3], 16),
        };
    }
    return null;
}
//# sourceMappingURL=GenericFunctions.js.map