import { apiRequest } from '../../../transport';
export async function del(index) {
    const postId = this.getNodeParameter('postId', index);
    const body = {};
    const qs = {};
    const requestMethod = 'DELETE';
    const endpoint = `posts/${postId}`;
    const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
    return this.helpers.returnJsonArray(responseData);
}
//# sourceMappingURL=execute.js.map