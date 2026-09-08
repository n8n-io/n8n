import { jsonParse, NodeOperationError } from 'n8n-workflow';
/**
 * Make an API request to NocoDB
 *
 */
export async function apiRequest(method, endpoint, body, query, uri, option = {}) {
    const authenticationMethod = this.getNodeParameter('authentication', 0);
    const credentials = await this.getCredentials(authenticationMethod);
    if (credentials === undefined) {
        throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
    }
    const baseUrl = credentials.host;
    query = query ?? {};
    uri =
        uri ?? (baseUrl.endsWith('/') ? `${baseUrl.slice(0, -1)}${endpoint}` : `${baseUrl}${endpoint}`);
    const options = {
        method,
        body,
        qs: query,
        url: uri,
        json: true,
    };
    if (Object.keys(option).length !== 0) {
        Object.assign(options, option);
    }
    if (Object.keys(body).length === 0) {
        delete options.body;
    }
    return await this.helpers.httpRequestWithAuthentication.call(this, authenticationMethod, options);
}
/**
 * Make an API request to paginated NocoDB endpoint
 * and return all results
 *
 * @param {(IHookFunctions | IExecuteFunctions)} this
 */
export async function apiRequestAllItems(method, endpoint, body, query) {
    query = query ?? {};
    const QUERY_LIMIT = 100;
    query.limit = QUERY_LIMIT;
    query.offset = query?.offset ? Number(query.offset) : 0;
    const returnData = [];
    let responseData;
    do {
        responseData = await apiRequest.call(this, method, endpoint, body, query);
        query.offset += QUERY_LIMIT;
        returnData.push.apply(returnData, responseData.records);
    } while (responseData.next);
    return returnData;
}
export async function downloadRecordAttachments(records, fieldNames, pairedItem) {
    const elements = [];
    const getAttachmentField = (record, fieldName) => {
        return record.fields[fieldName];
    };
    for (const record of records) {
        const element = { json: {}, binary: {} };
        if (pairedItem) {
            element.pairedItem = pairedItem;
        }
        element.json = record;
        for (const fieldName of fieldNames) {
            let attachments = getAttachmentField(record, fieldName);
            if (typeof attachments === 'string') {
                attachments = jsonParse(attachments);
            }
            if (attachments) {
                for (const [index, attachment] of attachments.entries()) {
                    const attachmentUrl = attachment.signedUrl || attachment.url;
                    const file = await apiRequest.call(this, 'GET', '', {}, {}, attachmentUrl, {
                        json: false,
                        encoding: 'arraybuffer',
                    });
                    element.binary[`${fieldName}_${index}`] = await this.helpers.prepareBinaryData(Buffer.from(file), attachment.title, attachment.mimetype);
                }
            }
        }
        if (Object.keys(element.binary).length === 0) {
            delete element.binary;
        }
        elements.push(element);
    }
    return elements;
}
//# sourceMappingURL=index.js.map