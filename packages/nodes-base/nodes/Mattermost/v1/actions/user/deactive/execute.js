import { apiRequest } from '../../../transport';
export async function deactive(index) {
    const userId = this.getNodeParameter('userId', index);
    const qs = {};
    const requestMethod = 'DELETE';
    const endpoint = `users/${userId}`;
    const body = {};
    const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
    return this.helpers.returnJsonArray(responseData);
}
//# sourceMappingURL=execute.js.map