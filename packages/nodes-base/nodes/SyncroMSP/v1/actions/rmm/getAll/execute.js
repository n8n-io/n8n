import { apiRequest, apiRequestAllItems } from '../../../transport';
export async function getAll(index) {
    const returnAll = this.getNodeParameter('returnAll', index);
    const filters = this.getNodeParameter('filters', index);
    let qs = {};
    const requestMethod = 'GET';
    const endpoint = 'rmm_alerts';
    const body = {};
    if (filters) {
        qs = filters;
    }
    if (qs.status === undefined) {
        qs.status = 'all';
    }
    if (!returnAll) {
        qs.per_page = this.getNodeParameter('limit', index);
    }
    let responseData;
    if (returnAll) {
        responseData = await apiRequestAllItems.call(this, requestMethod, endpoint, body, qs);
        return this.helpers.returnJsonArray(responseData);
    }
    else {
        responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
        return this.helpers.returnJsonArray(responseData.rmm_alerts);
    }
}
//# sourceMappingURL=execute.js.map