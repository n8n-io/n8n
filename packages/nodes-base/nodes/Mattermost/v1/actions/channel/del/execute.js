import { apiRequest } from '../../../transport';
export async function del(index) {
    const channelId = this.getNodeParameter('channelId', index);
    const body = {};
    const qs = {};
    const requestMethod = 'DELETE';
    const endpoint = `channels/${channelId}`;
    const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
    return this.helpers.returnJsonArray(responseData);
}
//# sourceMappingURL=execute.js.map