import { apiRequest } from '../../../transport';
export async function create(index) {
    const qs = {};
    const requestMethod = 'POST';
    const endpoint = 'reactions';
    const body = {
        user_id: this.getNodeParameter('userId', index),
        post_id: this.getNodeParameter('postId', index),
        emoji_name: this.getNodeParameter('emojiName', index).replace(/:/g, ''),
        create_at: Date.now(),
    };
    const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
    return this.helpers.returnJsonArray(responseData);
}
//# sourceMappingURL=execute.js.map