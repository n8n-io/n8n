import type { IDataObject, JsonObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { NOT_FOUND_CODES, NOT_FOUND_MESSAGE, REQUIRED_PERMISSIONS } from './constants';
import {
	toHttpCode,
	toPermissionKey,
	unwrapGraphError,
	type GraphRequestError,
} from './converters';
import type { AuthContext } from './interfaces';

/** Best-effort lookup; load-options contexts may not expose resource/operation. */
function lookupRequiredPermissions(
	this: AuthContext,
): { delegated: string; application: string } | undefined {
	try {
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		if (typeof resource === 'string' && typeof operation === 'string') {
			return REQUIRED_PERMISSIONS[toPermissionKey(resource, operation)];
		}
	} catch {}
	return undefined;
}

// App-only error bodies can include internal identifiers — surface only a
// fixed message + status (which lives on `httpCode` as a string when wrapped)
export function servicePrincipalApiError(
	this: AuthContext,
	error: GraphRequestError,
): NodeApiError {
	const httpCode = toHttpCode(error.httpCode ?? error.statusCode);

	let message: string;
	if (httpCode === undefined) {
		// No HTTP status means the request never got an answer — don't blame
		// inputs or permissions
		message = 'Could not reach Microsoft Graph. Check your network connection and try again.';
	} else if (httpCode === 404) {
		message = NOT_FOUND_MESSAGE;
	} else if (httpCode === 401) {
		message =
			"The Service Principal token was rejected. Check the app registration's client secret and that admin consent is granted.";
	} else if (httpCode === 403) {
		const permissions = lookupRequiredPermissions.call(this);
		message = permissions
			? `The app registration is missing a consented application permission for this operation: ${permissions.application}. Grant it and admin consent, then retry.`
			: 'The app registration is missing a consented application permission for this operation. Grant the required Microsoft Graph application permission and admin consent, then retry.';
	} else {
		message = `Microsoft Graph rejected the request (HTTP ${httpCode}). Check the operation's inputs and the app registration's permissions.`;
	}

	const sanitizedError: JsonObject = { message };
	const errorOptions: IDataObject = { message };
	if (httpCode !== undefined) {
		sanitizedError.httpStatusCode = httpCode;
		errorOptions.httpCode = `${httpCode}`;
	}
	return new NodeApiError(this.getNode(), sanitizedError, errorOptions);
}

// Always builds a fresh error object (never re-wraps `error` itself): once the
// underlying request goes through `httpRequestWithAuthentication`, `error` may
// already be a NodeApiError, and NodeApiError's constructor short-circuits
// (returns the same instance untouched) when re-wrapping one of its own, which
// would silently discard the message/description built below.
export function delegatedApiError(this: AuthContext, error: GraphRequestError): NodeApiError {
	const statusCode = toHttpCode(error.statusCode ?? error.httpCode);

	let message: string | undefined;
	let description: string | undefined;
	if (statusCode === 403) {
		// Missing scope OR no access to the site; callers key off httpCode '403'
		const permissions = lookupRequiredPermissions.call(this);
		message = permissions
			? `Microsoft Graph refused this request. The credential may be missing the ${permissions.delegated} permission, or the signed-in account may not have access to this resource`
			: 'Microsoft Graph refused this request. The credential may be missing a required permission, or the signed-in account may not have access to this resource';
		description =
			"Check the credential's scopes (with admin consent if your tenant requires it) and that the signed-in account can access the site, then try again.";
	} else {
		// Returns `error` itself, unchanged, when there's no nested Graph error to unwrap
		const unwrapped = unwrapGraphError(error);
		if (unwrapped !== error) {
			message =
				unwrapped.code && NOT_FOUND_CODES.includes(unwrapped.code)
					? NOT_FOUND_MESSAGE
					: unwrapped.message;
		}
	}

	const sanitizedError: JsonObject = message ? { message } : {};
	const errorOptions: IDataObject = message ? { message } : {};
	if (description) {
		errorOptions.description = description;
	}
	if (statusCode !== undefined) {
		sanitizedError.httpStatusCode = statusCode;
		errorOptions.httpCode = `${statusCode}`;
	}
	return new NodeApiError(this.getNode(), sanitizedError, errorOptions);
}
