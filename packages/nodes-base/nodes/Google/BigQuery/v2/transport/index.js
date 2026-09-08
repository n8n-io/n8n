import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { getGoogleAccessToken } from '../../../GenericFunctions';
export async function googleBigQueryApiRequest(method, resource, body = {}, qs = {}, uri, headers = {}) {
    const authenticationMethod = this.getNodeParameter('authentication', 0, 'serviceAccount');
    const options = {
        headers: {
            'Content-Type': 'application/json',
        },
        method,
        body,
        qs,
        uri: uri || `https://bigquery.googleapis.com/bigquery${resource}`,
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
            if (credentials === undefined) {
                throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
            }
            const { access_token } = await getGoogleAccessToken.call(this, credentials, 'bigquery');
            options.headers.Authorization = `Bearer ${access_token}`;
            return await this.helpers.request(options);
        }
        else {
            return await this.helpers.requestOAuth2.call(this, 'googleBigQueryOAuth2Api', options);
        }
    }
    catch (error) {
        if (error.code === 'ERR_OSSL_PEM_NO_START_LINE') {
            error.statusCode = '401';
        }
        throw new NodeApiError(this.getNode(), error, {
            message: error?.error?.error?.message || error.message,
        });
    }
}
export async function googleBigQueryApiRequestAllItems(method, endpoint, body = {}, query = {}) {
    let rows = [];
    let responseData;
    if (query.maxResults === undefined) {
        query.maxResults = 1000;
    }
    do {
        responseData = await googleBigQueryApiRequest.call(this, method, endpoint, body, query);
        query.pageToken = responseData.pageToken;
        rows = rows.concat(responseData.rows ?? []);
    } while (responseData.pageToken !== undefined && responseData.pageToken !== '');
    return { ...(responseData || {}), rows };
}
//# sourceMappingURL=index.js.map