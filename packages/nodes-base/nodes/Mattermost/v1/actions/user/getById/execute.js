import { apiRequest } from '../../../transport';
export async function getById(index) {
    const qs = {};
    const requestMethod = 'POST';
    const endpoint = 'users/ids';
    const userIds = this.getNodeParameter('userIds', index).split(',');
    const additionalFields = this.getNodeParameter('additionalFields', index);
    const body = userIds;
    if (additionalFields.since) {
        qs.since = new Date(additionalFields.since).getTime();
    }
    const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
    return this.helpers.returnJsonArray(responseData);
}
//# sourceMappingURL=execute.js.map