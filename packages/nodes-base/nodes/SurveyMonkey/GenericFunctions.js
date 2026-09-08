import { NodeApiError } from 'n8n-workflow';
export async function surveyMonkeyApiRequest(method, resource, body = {}, query = {}, uri, option = {}) {
    const authenticationMethod = this.getNodeParameter('authentication', 0);
    const endpoint = 'https://api.surveymonkey.com/v3';
    let options = {
        headers: {
            'Content-Type': 'application/json',
        },
        method,
        body,
        qs: query,
        uri: uri || `${endpoint}${resource}`,
        json: true,
    };
    if (!Object.keys(body).length) {
        delete options.body;
    }
    if (!Object.keys(query).length) {
        delete options.qs;
    }
    options = Object.assign({}, options, option);
    try {
        if (authenticationMethod === 'accessToken') {
            const credentials = await this.getCredentials('surveyMonkeyApi');
            options.headers.Authorization = `bearer ${credentials.accessToken}`;
            return await this.helpers.request(options);
        }
        else {
            return await this.helpers.requestOAuth2?.call(this, 'surveyMonkeyOAuth2Api', options);
        }
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function surveyMonkeyRequestAllItems(propertyName, method, endpoint, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    query.page = 1;
    query.per_page = 100;
    let uri;
    do {
        responseData = await surveyMonkeyApiRequest.call(this, method, endpoint, body, query, uri);
        uri = responseData.links.next;
        returnData.push.apply(returnData, responseData[propertyName]);
    } while (responseData.links.next);
    return returnData;
}
export function idsExist(ids, surveyIds) {
    for (const surveyId of surveyIds) {
        if (!ids.includes(surveyId)) {
            return false;
        }
    }
    return true;
}
//# sourceMappingURL=GenericFunctions.js.map