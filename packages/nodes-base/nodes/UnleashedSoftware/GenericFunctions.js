import { createHmac } from 'crypto';
import { NodeApiError } from 'n8n-workflow';
import qs from 'qs';
export async function unleashedApiRequest(method, path, body = {}, query = {}, pageNumber, headers) {
    const paginatedPath = pageNumber ? `/${path}/${pageNumber}` : `/${path}`;
    const options = {
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        method,
        qs: query,
        body,
        url: `https://api.unleashedsoftware.com/${paginatedPath}`,
        json: true,
    };
    if (Object.keys(body).length === 0) {
        delete options.body;
    }
    const credentials = await this.getCredentials('unleashedSoftwareApi');
    const signature = createHmac('sha256', credentials.apiKey)
        .update(qs.stringify(query))
        .digest('base64');
    options.headers = Object.assign({}, headers, {
        'api-auth-id': credentials.apiId,
        'api-auth-signature': signature,
    });
    try {
        return await this.helpers.request(options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function unleashedApiRequestAllItems(propertyName, method, endpoint, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    let pageNumber = 1;
    query.pageSize = 1000;
    do {
        responseData = await unleashedApiRequest.call(this, method, endpoint, body, query, pageNumber);
        returnData.push.apply(returnData, responseData[propertyName]);
        pageNumber++;
    } while (responseData.Pagination.PageNumber <
        responseData.Pagination.NumberOfPages);
    return returnData;
}
//.NET code is serializing dates in the following format: "/Date(1586833770780)/"
//which is useless on JS side and could not treated as a date for other nodes
//so we need to convert all of the fields that has it.
export function convertNETDates(item, serializeDates = false) {
    Object.keys(item).forEach((path) => {
        const type = typeof item[path];
        if (type === 'string') {
            const value = item[path];
            const a = /\/Date\((\d*)\)\//.exec(value);
            if (a) {
                const date = new Date(+a[1]);
                // v1.1+ returns ISO strings so node output stays JSON-safe
                item[path] = serializeDates ? date.toISOString() : date;
            }
        }
        if (type === 'object' && item[path]) {
            convertNETDates(item[path], serializeDates);
        }
    });
}
//# sourceMappingURL=GenericFunctions.js.map