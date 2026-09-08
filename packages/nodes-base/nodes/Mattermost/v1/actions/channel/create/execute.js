import { apiRequest } from '../../../transport';
export async function create(index) {
    const body = {};
    const qs = {};
    const requestMethod = 'POST';
    const endpoint = 'channels';
    const type = this.getNodeParameter('type', index);
    body.team_id = this.getNodeParameter('teamId', index);
    body.display_name = this.getNodeParameter('displayName', index);
    body.name = this.getNodeParameter('channel', index);
    body.type = type === 'public' ? 'O' : 'P';
    const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
    return this.helpers.returnJsonArray(responseData);
}
//# sourceMappingURL=execute.js.map