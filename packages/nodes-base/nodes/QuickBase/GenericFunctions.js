import { NodeApiError, NodeOperationError } from 'n8n-workflow';
export async function quickbaseApiRequest(method, resource, body = {}, qs = {}, option = {}) {
    const credentials = await this.getCredentials('quickbaseApi');
    if (!credentials.hostname) {
        throw new NodeOperationError(this.getNode(), 'Hostname must be defined');
    }
    if (!credentials.userToken) {
        throw new NodeOperationError(this.getNode(), 'User Token must be defined');
    }
    try {
        const options = {
            headers: {
                'QB-Realm-Hostname': credentials.hostname,
                Authorization: `QB-USER-TOKEN ${credentials.userToken}`,
                'Content-Type': 'application/json',
            },
            method,
            body,
            qs,
            uri: `https://api.quickbase.com/v1${resource}`,
            json: true,
        };
        if (Object.keys(body).length === 0) {
            delete options.body;
        }
        if (Object.keys(qs).length === 0) {
            delete options.qs;
        }
        if (Object.keys(option).length !== 0) {
            Object.assign(options, option);
        }
        return await this.helpers?.request(options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function getFieldsObject(tableId) {
    const fieldsLabelKey = {};
    const fieldsIdKey = {};
    const data = await quickbaseApiRequest.call(this, 'GET', '/fields', {}, { tableId });
    for (const field of data) {
        fieldsLabelKey[field.label] = field.id;
        fieldsIdKey[field.id] = field.label;
    }
    return { fieldsLabelKey, fieldsIdKey };
}
export async function quickbaseApiRequestAllItems(method, resource, body = {}, query = {}) {
    const returnData = [];
    let responseData = [];
    if (method === 'POST') {
        body.options = {
            skip: 0,
            top: 100,
        };
    }
    else {
        query.skip = 0;
        query.top = 100;
    }
    let metadata;
    do {
        const { data, fields, metadata: meta, } = await quickbaseApiRequest.call(this, method, resource, body, query);
        metadata = meta;
        const fieldsIdKey = {};
        for (const field of fields) {
            fieldsIdKey[field.id] = field.label;
        }
        for (const record of data) {
            const recordData = {};
            for (const [key, value] of Object.entries(record)) {
                recordData[fieldsIdKey[key]] = value.value;
            }
            responseData.push(recordData);
        }
        if (method === 'POST') {
            body.options.skip += body.options.top;
        }
        else {
            //@ts-ignore
            query.skip += query.top;
        }
        returnData.push.apply(returnData, responseData);
        responseData = [];
    } while (returnData.length < metadata.totalRecords);
    return returnData;
}
//# sourceMappingURL=GenericFunctions.js.map