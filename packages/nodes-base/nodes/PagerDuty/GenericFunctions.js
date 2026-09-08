import { snakeCase } from 'change-case';
import { NodeApiError } from 'n8n-workflow';
export async function pagerDutyApiRequest(method, resource, body = {}, query = {}, uri, headers = {}) {
    const authenticationMethod = this.getNodeParameter('authentication', 0);
    const options = {
        headers: {
            Accept: 'application/vnd.pagerduty+json;version=2',
        },
        method,
        body,
        qs: query,
        uri: uri || `https://api.pagerduty.com${resource}`,
        json: true,
        qsStringifyOptions: {
            arrayFormat: 'brackets',
        },
    };
    if (!Object.keys(body).length) {
        delete options.form;
    }
    if (!Object.keys(query).length) {
        delete options.qs;
    }
    options.headers = Object.assign({}, options.headers, headers);
    try {
        if (authenticationMethod === 'apiToken') {
            const credentials = await this.getCredentials('pagerDutyApi');
            options.headers.Authorization = `Token token=${credentials.apiToken}`;
            return await this.helpers.request(options);
        }
        else {
            return await this.helpers.requestOAuth2.call(this, 'pagerDutyOAuth2Api', options);
        }
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function pagerDutyApiRequestAllItems(propertyName, method, endpoint, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    // PagerDuty's `offset` is the index of the first record to return, not a page
    // number, so it has to advance by the page size to reach the next page.
    const limit = 100;
    query.limit = limit;
    query.offset = 0;
    do {
        responseData = await pagerDutyApiRequest.call(this, method, endpoint, body, query);
        query.offset = query.offset + limit;
        returnData.push.apply(returnData, responseData[propertyName]);
    } while (responseData.more);
    return returnData;
}
export function keysToSnakeCase(elements) {
    if (!Array.isArray(elements)) {
        elements = [elements];
    }
    for (const element of elements) {
        for (const key of Object.keys(element)) {
            if (key !== snakeCase(key)) {
                element[snakeCase(key)] = element[key];
                delete element[key];
            }
        }
    }
    return elements;
}
//# sourceMappingURL=GenericFunctions.js.map