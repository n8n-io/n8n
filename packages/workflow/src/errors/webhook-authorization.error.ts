import { ApplicationError } from '@n8n/errors';

/**
 * Error thrown when webhook authentication fails.
 * Used for HTTP Basic Auth, API key validation, and other auth methods.
 */
export class WebhookAuthorizationError extends ApplicationError {
	constructor(
		readonly responseCode: number,
		message?: string,
	) {
		if (message === undefined) {
			message = 'Authorization problem!';
			if (responseCode === 401) {
				message = 'Authorization is required!';
			} else if (responseCode === 403) {
				message = 'Authorization data is wrong!';
			}
		}
		super(message);
	}
}
