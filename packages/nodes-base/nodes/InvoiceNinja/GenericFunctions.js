import get from 'lodash/get';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
export const eventID = {
    create_client: '1',
    create_invoice: '2',
    create_quote: '3',
    create_payment: '4',
    create_vendor: '5',
};
export async function invoiceNinjaApiRequest(method, endpoint, body = {}, query, uri) {
    const credentials = await this.getCredentials('invoiceNinjaApi');
    if (credentials === undefined) {
        throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
    }
    const version = this.getNodeParameter('apiVersion', 0);
    const defaultUrl = version === 'v4' ? 'https://app.invoiceninja.com' : 'https://invoicing.co';
    const baseUrl = credentials.url || defaultUrl;
    const options = {
        method,
        qs: query,
        uri: uri || `${baseUrl}/api/v1${endpoint}`,
        body,
        json: true,
    };
    try {
        return await this.helpers.requestWithAuthentication.call(this, 'invoiceNinjaApi', options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function invoiceNinjaApiRequestAllItems(propertyName, method, endpoint, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    let uri;
    query.per_page = 100;
    do {
        responseData = await invoiceNinjaApiRequest.call(this, method, endpoint, body, query, uri);
        const next = get(responseData, 'meta.pagination.links.next');
        if (next) {
            uri = next;
        }
        returnData.push.apply(returnData, responseData[propertyName]);
    } while (responseData.meta?.pagination?.links?.next);
    return returnData;
}
//# sourceMappingURL=GenericFunctions.js.map