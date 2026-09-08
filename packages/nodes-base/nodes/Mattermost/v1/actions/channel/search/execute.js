import { apiRequest } from '../../../transport';
export async function search(index) {
    const body = {};
    const qs = {};
    const requestMethod = 'POST';
    const teamId = this.getNodeParameter('teamId', index);
    const returnAll = this.getNodeParameter('returnAll', 0);
    const endpoint = `teams/${teamId}/channels/search`;
    body.term = this.getNodeParameter('term', index);
    let responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
    if (!returnAll) {
        const limit = this.getNodeParameter('limit', 0);
        responseData = responseData.slice(0, limit);
    }
    return this.helpers.returnJsonArray(responseData);
}
//# sourceMappingURL=execute.js.map