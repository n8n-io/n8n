import { apiRequest } from '../../../transport';
export async function getAlert(index) {
    const id = this.getNodeParameter('alertId', index);
    const qs = {};
    const requestMethod = 'GET';
    const endpoint = `rmm_alerts/${id}`;
    const body = {};
    const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
    return this.helpers.returnJsonArray(responseData.rmm_alert);
}
//# sourceMappingURL=execute.js.map