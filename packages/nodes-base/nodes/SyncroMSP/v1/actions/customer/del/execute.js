import { apiRequest } from '../../../transport';
export async function deleteCustomer(index) {
    const id = this.getNodeParameter('customerId', index);
    const qs = {};
    const requestMethod = 'DELETE';
    const endpoint = `customers/${id}`;
    const body = {};
    const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
    return this.helpers.returnJsonArray(responseData);
}
//# sourceMappingURL=execute.js.map