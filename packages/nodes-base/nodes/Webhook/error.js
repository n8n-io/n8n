import { UserError } from 'n8n-workflow';
export class WebhookAuthorizationError extends UserError {
    responseCode;
    constructor(responseCode, message) {
        if (message === undefined) {
            message = 'Authorization problem!';
            if (responseCode === 401) {
                message = 'Authorization is required!';
            }
            else if (responseCode === 403) {
                message = 'Authorization data is wrong!';
            }
        }
        super(message);
        this.responseCode = responseCode;
    }
}
//# sourceMappingURL=error.js.map