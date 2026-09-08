import { apiRequest } from '../../../transport';
export async function deleteAlert(index) {
    const id = this.getNodeParameter('alertId', index);
    const qs = {};
    const requestMethod = 'DELETE';
    const endpoint = `rmm_alerts/${id}`;
    const body = {};
    const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
    return this.helpers.returnJsonArray(responseData);
}
//# sourceMappingURL=execute.js.map