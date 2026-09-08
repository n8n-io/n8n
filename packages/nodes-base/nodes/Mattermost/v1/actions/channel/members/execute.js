import { apiRequest, apiRequestAllItems } from '../../../transport';
export async function members(index) {
    const channelId = this.getNodeParameter('channelId', index);
    const returnAll = this.getNodeParameter('returnAll', index);
    const resolveData = this.getNodeParameter('resolveData', index);
    const limit = this.getNodeParameter('limit', index, 0);
    const body = {};
    const qs = {};
    const requestMethod = 'GET';
    const endpoint = `channels/${channelId}/members`;
    if (!returnAll) {
        qs.per_page = this.getNodeParameter('limit', index);
    }
    let responseData;
    if (returnAll) {
        responseData = await apiRequestAllItems.call(this, requestMethod, endpoint, body, qs);
    }
    else {
        responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
        if (limit) {
            responseData = responseData.slice(0, limit);
        }
        if (resolveData) {
            const userIds = [];
            for (const data of responseData) {
                userIds.push(data.user_id);
            }
            if (userIds.length > 0) {
                responseData = await apiRequest.call(this, 'POST', 'users/ids', userIds, qs);
            }
        }
    }
    return this.helpers.returnJsonArray(responseData);
}
//# sourceMappingURL=execute.js.map