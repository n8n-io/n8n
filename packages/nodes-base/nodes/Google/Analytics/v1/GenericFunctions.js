import { NodeApiError } from 'n8n-workflow';
export async function googleApiRequest(method, endpoint, body = {}, qs = {}, uri, option = {}) {
    const baseURL = 'https://analyticsreporting.googleapis.com';
    let options = {
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        method,
        body,
        qs,
        uri: uri || `${baseURL}${endpoint}`,
        json: true,
    };
    options = Object.assign({}, options, option);
    try {
        if (Object.keys(body).length === 0) {
            delete options.body;
        }
        if (Object.keys(qs).length === 0) {
            delete options.qs;
        }
        return await this.helpers.requestOAuth2.call(this, 'googleAnalyticsOAuth2', options);
    }
    catch (error) {
        const errorData = (error.message || '').split(' - ')[1];
        if (errorData) {
            const parsedError = JSON.parse(errorData.trim());
            const [message, ...rest] = parsedError.error.message.split('\n');
            const description = rest.join('\n');
            const httpCode = parsedError.error.code;
            throw new NodeApiError(this.getNode(), error, {
                message,
                description,
                httpCode,
            });
        }
        throw new NodeApiError(this.getNode(), error, { message: error.message });
    }
}
export async function googleApiRequestAllItems(propertyName, method, endpoint, body = {}, query = {}, uri) {
    const returnData = [];
    let responseData;
    do {
        responseData = await googleApiRequest.call(this, method, endpoint, body, query, uri);
        if (body.reportRequests && Array.isArray(body.reportRequests)) {
            body.reportRequests[0].pageToken =
                responseData[propertyName][0].nextPageToken;
        }
        else {
            body.pageToken = responseData.nextPageToken;
        }
        returnData.push.apply(returnData, responseData[propertyName]);
    } while ((responseData.nextPageToken !== undefined && responseData.nextPageToken !== '') ||
        responseData[propertyName]?.[0].nextPageToken !== undefined);
    return returnData;
}
export function simplify(responseData) {
    const response = [];
    for (const { columnHeader: { dimensions, metricHeader }, data: { rows }, } of responseData) {
        if (rows === undefined) {
            // Do not error if there is no data
            continue;
        }
        const metrics = metricHeader.metricHeaderEntries.map((entry) => entry.name);
        for (const row of rows) {
            const data = {};
            if (dimensions) {
                for (let i = 0; i < dimensions.length; i++) {
                    data[dimensions[i]] = row.dimensions[i];
                    for (const [index, metric] of metrics.entries()) {
                        data[metric] = row.metrics[0].values[index];
                    }
                }
            }
            else {
                for (const [index, metric] of metrics.entries()) {
                    data[metric] = row.metrics[0].values[index];
                }
            }
            response.push(data);
        }
    }
    return response;
}
export function merge(responseData) {
    const response = {
        columnHeader: responseData[0].columnHeader,
        data: responseData[0].data,
    };
    const allRows = [];
    for (const { data: { rows }, } of responseData) {
        allRows.push(...rows);
    }
    response.data.rows = allRows;
    return [response];
}
//# sourceMappingURL=GenericFunctions.js.map