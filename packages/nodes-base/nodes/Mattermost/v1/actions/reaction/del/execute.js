import { apiRequest } from '../../../transport';
export async function del(index) {
    const userId = this.getNodeParameter('userId', index);
    const postId = this.getNodeParameter('postId', index);
    const emojiName = this.getNodeParameter('emojiName', index).replace(/:/g, '');
    const qs = {};
    const requestMethod = 'DELETE';
    const endpoint = `users/${userId}/posts/${postId}/reactions/${emojiName}`;
    const body = {};
    const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
    return this.helpers.returnJsonArray(responseData);
}
//# sourceMappingURL=execute.js.map