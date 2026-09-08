import { apiRequest } from '../../../transport';
export async function addUser(index) {
    const channelId = this.getNodeParameter('channelId', index);
    const body = {};
    const qs = {};
    const requestMethod = 'POST';
    const endpoint = `channels/${channelId}/members`;
    body.user_id = this.getNodeParameter('userId', index);
    const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
    return this.helpers.returnJsonArray(responseData);
}
//# sourceMappingURL=execute.js.map