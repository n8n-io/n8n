import { apiRequest } from '../../../transport';
export async function statistics(index) {
    const channelId = this.getNodeParameter('channelId', index);
    const body = {};
    const qs = {};
    const requestMethod = 'GET';
    const endpoint = `channels/${channelId}/stats`;
    const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
    return this.helpers.returnJsonArray(responseData);
}
//# sourceMappingURL=execute.js.map