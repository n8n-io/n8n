import { apiRequest } from '../../../transport';
export async function getByEmail(index) {
    const email = this.getNodeParameter('email', index);
    const qs = {};
    const requestMethod = 'GET';
    const endpoint = `users/email/${email}`;
    const body = {};
    const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
    return this.helpers.returnJsonArray(responseData);
}
//# sourceMappingURL=execute.js.map