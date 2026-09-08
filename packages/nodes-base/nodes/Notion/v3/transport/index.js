import { NodeApiError, NodeOperationError } from 'n8n-workflow';
const NOTION_VERSION_HEADER = 'Notion-Version';
const NOTION_API_VERSION = '2026-03-11';
export function isDataObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}
export async function notionApiRequestV3(method, resource, body = {}, qs = {}) {
    try {
        const options = {
            method,
            qs,
            body,
            url: `https://api.notion.com/v1${resource}`,
            json: true,
            headers: {
                [NOTION_VERSION_HEADER]: NOTION_API_VERSION,
            },
        };
        if (Object.keys(body).length === 0) {
            delete options.body;
        }
        const authentication = this.getNodeParameter('authentication', 0, 'apiKey');
        const credentialType = authentication === 'oAuth2' ? 'notionOAuth2Api' : 'notionApi';
        return (await this.helpers.httpRequestWithAuthentication.call(this, credentialType, options));
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function notionApiRequestAllItemsV3(propertyName, method, endpoint, body = {}, query = {}) {
    const limit = query.limit;
    delete query.limit;
    const returnData = [];
    let responseData;
    do {
        responseData = await notionApiRequestV3.call(this, method, endpoint, body, query);
        const nextCursor = responseData.next_cursor;
        if (method === 'GET') {
            query.start_cursor = nextCursor;
        }
        else {
            body.start_cursor = nextCursor;
        }
        const page = responseData[propertyName];
        if (Array.isArray(page)) {
            returnData.push.apply(returnData, page.filter(isDataObject));
        }
        if (limit && limit <= returnData.length) {
            return returnData.slice(0, limit);
        }
    } while (responseData.has_more !== false);
    return limit ? returnData.slice(0, limit) : returnData;
}
export async function getDataSourceProperties(dataSourceId) {
    const dataSource = await notionApiRequestV3.call(this, 'GET', `/data_sources/${dataSourceId}`);
    if (!isDataObject(dataSource.properties)) {
        throw new NodeOperationError(this.getNode(), 'Notion did not return data source properties');
    }
    return dataSource.properties;
}
//# sourceMappingURL=index.js.map