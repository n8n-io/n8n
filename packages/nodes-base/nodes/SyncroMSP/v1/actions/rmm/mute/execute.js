import { apiRequest } from '../../../transport';
export async function muteAlert(index) {
    const id = this.getNodeParameter('alertId', index);
    const mute = this.getNodeParameter('muteFor', index);
    const qs = {};
    const requestMethod = 'POST';
    const endpoint = `rmm_alerts/${id}/mute`;
    const body = {};
    body.id = id;
    body.mute_for = mute;
    const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
    return this.helpers.returnJsonArray(responseData);
}
//# sourceMappingURL=execute.js.map