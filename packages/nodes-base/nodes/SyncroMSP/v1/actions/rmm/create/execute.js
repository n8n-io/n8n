import { apiRequest } from '../../../transport';
export async function addAlert(index) {
    const customerId = this.getNodeParameter('customerId', index);
    const assetId = this.getNodeParameter('assetId', index);
    const description = this.getNodeParameter('description', index);
    const additionalFields = this.getNodeParameter('additionalFields', index);
    const qs = {};
    const requestMethod = 'POST';
    const endpoint = 'rmm_alerts';
    let body = {};
    if (additionalFields) {
        body = additionalFields;
    }
    body.customer_id = customerId;
    body.asset_id = assetId;
    body.description = description;
    const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
    return this.helpers.returnJsonArray(responseData.alert);
}
//# sourceMappingURL=execute.js.map