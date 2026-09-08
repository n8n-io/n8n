import { apiRequest } from '../../../transport';
export async function invite(index) {
    const teamId = this.getNodeParameter('teamId', index);
    const emails = this.getNodeParameter('emails', index).split(',');
    const qs = {};
    const requestMethod = 'POST';
    const endpoint = `teams/${teamId}/invite/email`;
    const body = emails;
    const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
    return this.helpers.returnJsonArray(responseData);
}
//# sourceMappingURL=execute.js.map