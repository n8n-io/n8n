import { ApplicationError } from '@n8n/errors';

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

/**
 * Thrown by `validateWebhookAuthentication` when the `oauthLogin` auth mode has no
 * valid session JWT in the request. Carries the IDP authorize URL so the caller can
 * redirect the visitor.
 *
 * Subclass of `WebhookAuthorizationError`, so existing `instanceof
 * WebhookAuthorizationError` catch sites continue to emit 401. Callers that want the
 * 302-redirect behaviour must check for this subclass *before* the base class.
 */
export class WebhookOauthAuthorizationError extends WebhookAuthorizationError {
	constructor(readonly redirectUrl: string) {
		super(401, 'OAuth login required');
	}
}
