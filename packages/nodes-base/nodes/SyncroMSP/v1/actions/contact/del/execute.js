import { apiRequest } from '../../../transport';
export async function deleteContact(index) {
    const id = this.getNodeParameter('contactId', index);
    const qs = {};
    const requestMethod = 'DELETE';
    const endpoint = `contacts/${id}`;
    const body = {};
    const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
    return this.helpers.returnJsonArray(responseData);
}
//# sourceMappingURL=execute.js.map