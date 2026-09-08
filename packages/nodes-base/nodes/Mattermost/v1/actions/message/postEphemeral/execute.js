import { apiRequest } from '../../../transport';
export async function postEphemeral(index) {
    const qs = {};
    const requestMethod = 'POST';
    const endpoint = 'posts/ephemeral';
    const body = {
        user_id: this.getNodeParameter('userId', index),
        post: {
            channel_id: this.getNodeParameter('channelId', index),
            message: this.getNodeParameter('message', index),
        },
    };
    const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
    return this.helpers.returnJsonArray(responseData);
}
//# sourceMappingURL=execute.js.map