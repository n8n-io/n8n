import { UserError } from 'n8n-workflow';

export class WebhookAuthorizationError extends UserError {
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

// TODO: Renamed, if needed
export class OAuthResourceServerAuthError extends UserError {
	constructor(readonly resourceMetadataUrl: string) {
		super('Authorization problem!');
	}
}
