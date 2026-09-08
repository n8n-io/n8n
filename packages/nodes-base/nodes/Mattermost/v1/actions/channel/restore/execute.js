import { apiRequest } from '../../../transport';
export async function restore(index) {
    const channelId = this.getNodeParameter('channelId', index);
    const body = {};
    const qs = {};
    const requestMethod = 'POST';
    const endpoint = `channels/${channelId}/restore`;
    const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
    return this.helpers.returnJsonArray(responseData);
}
//# sourceMappingURL=execute.js.map