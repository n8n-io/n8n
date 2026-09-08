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
    query = query || {};
    if (!uri) {
        uri = baseUrl.endsWith('/') ? `${baseUrl.slice(0, -1)}${endpoint}` : `${baseUrl}${endpoint}`;
    }
    const options = {
        method,
        body,
        qs: query,
        uri,
        json: true,
    };
    if (Object.keys(option).length !== 0) {
        Object.assign(options, option);
    }
    if (Object.keys(body).length === 0) {
        delete options.body;
    }
    return await this.helpers.requestWithAuthentication.call(this, authenticationMethod, options);
}
/**
 * Make an API request to paginated NocoDB endpoint
 * and return all results
 *
 * @param {(IHookFunctions | IExecuteFunctions)} this
 */
export async function apiRequestAllItems(method, endpoint, body, query) {
    const version = this.getNode().typeVersion;
    if (query === undefined) {
        query = {};
    }
    query.limit = 100;
    query.offset = query?.offset ? query.offset : 0;
    const returnData = [];
    let responseData;
    do {
        responseData = await apiRequest.call(this, method, endpoint, body, query);
        version === 1
            ? returnData.push.apply(returnData, responseData)
            : returnData.push.apply(returnData, responseData.list);
        query.offset += query.limit;
    } while (version === 1 ? responseData.length !== 0 : responseData.pageInfo.isLastPage !== true);
    return returnData;
}
export async function downloadRecordAttachments(records, fieldNames, pairedItem) {
    const elements = [];
    for (const record of records) {
        const element = { json: {}, binary: {} };
        if (pairedItem) {
            element.pairedItem = pairedItem;
        }
        element.json = record;
        for (const fieldName of fieldNames) {
            let attachments = record[fieldName];
            if (typeof attachments === 'string') {
                attachments = jsonParse(record[fieldName]);
            }
            if (record[fieldName]) {
                for (const [index, attachment] of attachments.entries()) {
                    const attachmentUrl = attachment.signedUrl || attachment.url;
                    const file = await apiRequest.call(this, 'GET', '', {}, {}, attachmentUrl, {
                        json: false,
                        encoding: null,
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
//# sourceMappingURL=GenericFunctions.js.map