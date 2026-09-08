import { apiRequest } from '../../../transport';
export async function create(index) {
    const username = this.getNodeParameter('username', index);
    const authService = this.getNodeParameter('authService', index);
    const additionalFields = this.getNodeParameter('additionalFields', index);
    const qs = {};
    const requestMethod = 'POST';
    const endpoint = 'users';
    const body = {};
    body.auth_service = authService;
    body.username = username;
    Object.assign(body, additionalFields);
    if (body.notificationUi) {
        body.notify_props = body.notificationUi.notificationValues;
    }
    if (authService === 'email') {
        body.email = this.getNodeParameter('email', index);
        body.password = this.getNodeParameter('password', index);
    }
    else {
        body.auth_data = this.getNodeParameter('authData', index);
    }
    const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
    return this.helpers.returnJsonArray(responseData);
}
//# sourceMappingURL=execute.js.map