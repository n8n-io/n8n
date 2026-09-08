import { apiRequest, apiRequestAllItems } from '../../../transport';
export async function getAll(index) {
    const returnAll = this.getNodeParameter('returnAll', index);
    const qs = {};
    const requestMethod = 'GET';
    const endpoint = 'contacts';
    const body = {};
    let responseData;
    if (returnAll) {
        responseData = await apiRequestAllItems.call(this, requestMethod, endpoint, body, qs);
        return this.helpers.returnJsonArray(responseData);
    }
    else {
        const limit = this.getNodeParameter('limit', index);
        responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
        return this.helpers.returnJsonArray(responseData.contacts.splice(0, limit));
    }
}
//# sourceMappingURL=execute.js.map