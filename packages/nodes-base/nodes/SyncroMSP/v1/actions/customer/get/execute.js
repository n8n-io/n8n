import { apiRequest } from '../../../transport';
export async function getCustomer(index) {
    const id = this.getNodeParameter('customerId', index);
    const qs = {};
    const requestMethod = 'GET';
    const endpoint = `customers/${id}`;
    const body = {};
    const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
    return this.helpers.returnJsonArray(responseData.customer);
}
//# sourceMappingURL=execute.js.map