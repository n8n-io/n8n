import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IRequestOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { capitalize } from '../../../../../utils/utilities';

/**
 * Credential-name literal of the shared `microsoftEntraServicePrincipalApi`
 * (app-only) credential. Used as both the `authentication` selector value and
 * the credential type, so a rename stays in one place.
 */
export const SERVICE_PRINCIPAL_AUTH = 'microsoftEntraServicePrincipalApi';

export type SharePointCredentialType = 'microsoftOAuth2Api' | typeof SERVICE_PRINCIPAL_AUTH;

export const DEFAULT_GRAPH_BASE_URL = 'https://graph.microsoft.com';

// Graph permissions per `resource:operation`, consulted on a 403 so the error
// can name what's missing. Every action ticket adds its own row.
export const REQUIRED_PERMISSIONS: Record<string, { delegated: string; application: string }> = {
	'list:get': {
		delegated: 'Sites.Read.All',
		application: 'Sites.Read.All (or Sites.Selected granted for this site)',
	},
};

/**
 * Allow-list resolver for the `authentication` selector: anything other than
 * the Service Principal value (incl. the load-options fallback `0`) resolves
 * to the generic Graph credential. v2 never offers the legacy v1 credential.
 */
export function getSharePointCredentialType(
	this: IExecuteFunctions | ILoadOptionsFunctions,
): SharePointCredentialType {
	// `0` is the execute item index; in load-options contexts getNodeParameter
	// treats the 2nd arg as the FALLBACK value, so don't switch to the 3-arg form.
	const selected = this.getNodeParameter('authentication', 0);
	return selected === SERVICE_PRINCIPAL_AUTH ? SERVICE_PRINCIPAL_AUTH : 'microsoftOAuth2Api';
}

/** Best-effort lookup; load-options contexts may not expose resource/operation. */
function lookupRequiredPermissions(
	this: IExecuteFunctions | ILoadOptionsFunctions,
): { delegated: string; application: string } | undefined {
	try {
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		if (typeof resource === 'string' && typeof operation === 'string') {
			return REQUIRED_PERMISSIONS[`${resource}:${operation}`];
		}
	} catch {}
	return undefined;
}

export async function microsoftApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	uri?: string,
	headers: IDataObject = {},
): Promise<IDataObject> {
	const credentialType = getSharePointCredentialType.call(this);
	const isServicePrincipal = credentialType === SERVICE_PRINCIPAL_AUTH;
	const credentials = await this.getCredentials(credentialType);
	const baseUrl = (
		typeof credentials.graphApiBaseUrl === 'string' && credentials.graphApiBaseUrl !== ''
			? credentials.graphApiBaseUrl
			: DEFAULT_GRAPH_BASE_URL
	).replace(/\/+$/, '');
	const options: IRequestOptions = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		// An explicit `uri` is passed through VERBATIM — next-page links returned
		// by Graph (@odata.nextLink) must never be rebuilt.
		uri: uri ?? `${baseUrl}${resource}`,
		json: true,
	};
	try {
		if (Object.keys(headers).length !== 0) {
			options.headers = Object.assign({}, options.headers, headers);
		}
		// The Service Principal credential is not an `oAuth2Api` parent type — it
		// mints a bearer via preAuthentication + attaches it via authenticate, so it
		// must go through `requestWithAuthentication` (core's single 401-retry re-runs
		// the token mint). OAuth2 credentials keep using `requestOAuth2`.
		if (isServicePrincipal) {
			return await this.helpers.requestWithAuthentication.call(this, credentialType, options);
		}
		return await this.helpers.requestOAuth2.call(this, credentialType, options);
	} catch (error) {
		if (isServicePrincipal) {
			// App-only error bodies can carry correlation IDs and reflected input —
			// throw a sanitized static message + status instead of the raw body.
			// The status lives on `httpCode` (string) when wrapped by NodeApiError.
			const rawCode = error?.httpCode ?? error?.statusCode;
			const httpCode: number | undefined =
				rawCode === undefined || rawCode === null ? undefined : Number(rawCode);

			let nodeResource: string | undefined;
			try {
				const resourceParam = this.getNodeParameter('resource', 0);
				if (typeof resourceParam === 'string' && resourceParam !== '') {
					nodeResource = capitalize(resourceParam);
				}
			} catch {
				nodeResource = undefined;
			}

			let message: string;
			if (httpCode === 404 && nodeResource) {
				message = `${nodeResource} not found`;
			} else if (httpCode === 401) {
				message =
					"The Service Principal token was rejected. Check the app registration's client secret and that admin consent is granted.";
			} else if (httpCode === 403) {
				const permissions = lookupRequiredPermissions.call(this);
				message = permissions
					? `The app registration is missing a consented application permission for this operation: ${permissions.application}. Grant it and admin consent, then retry.`
					: 'The app registration is missing a consented application permission for this operation. Grant the required Microsoft Graph application permission and admin consent, then retry.';
			} else {
				message = `Microsoft Graph rejected the request (HTTP ${httpCode ?? 'unknown'}). Check the operation's inputs and the app registration's permissions.`;
			}

			const sanitizedError: JsonObject = { message };
			const errorOptions: IDataObject = { message };
			if (httpCode !== undefined && !Number.isNaN(httpCode)) {
				sanitizedError.httpStatusCode = httpCode;
				errorOptions.httpCode = `${httpCode}`;
			}
			throw new NodeApiError(this.getNode(), sanitizedError, errorOptions);
		}

		const errorOptions: IDataObject = {};
		const statusCode = Number(error?.statusCode ?? error?.httpCode);
		if (statusCode === 403) {
			// A 403 can mean a missing scope OR a granted scope without access to the
			// target site. Callers (e.g. site search) key off httpCode '403'.
			const permissions = lookupRequiredPermissions.call(this);
			errorOptions.message = permissions
				? `Microsoft Graph refused this request. The credential may be missing the ${permissions.delegated} permission, or the signed-in account may not have access to this resource`
				: 'Microsoft Graph refused this request. The credential may be missing a required permission, or the signed-in account may not have access to this resource';
			errorOptions.description =
				"Check the credential's scopes (with admin consent if your tenant requires it) and that the signed-in account can access the site, then try again.";
			errorOptions.httpCode = '403';
		} else if (error.error?.error) {
			const httpCode = error.statusCode;
			error = error.error.error;
			error.statusCode = httpCode;
			errorOptions.message = error.message;

			if (error.code === 'NotFound' && error.message === 'Resource not found') {
				const resourceParam = this.getNodeParameter('resource', 0);
				if (typeof resourceParam === 'string' && resourceParam !== '') {
					errorOptions.message = `${capitalize(resourceParam)} not found`;
				}
			}
		}
		throw new NodeApiError(this.getNode(), error as JsonObject, errorOptions);
	}
}
